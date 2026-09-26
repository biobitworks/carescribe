export const ACTOR_ROLES = new Set(["provider", "caregiver", "child", "uncertain"]);

export function normalizeActor(name, role) {
  const actorName = String(name || "").trim().slice(0, 40);
  if (!actorName) throw new Error("Enter a temporary display name.");
  if (!ACTOR_ROLES.has(role)) throw new Error("Choose a valid role.");
  return { name: actorName, role };
}

export function minimizedPublicUpdate(role) {
  if (role === "child") {
    return {
      public_update: "Child communication signal observed; meaning remains unknown.",
      uncertainty: "UNKNOWN",
    };
  }
  if (role === "caregiver") {
    return {
      public_update: "Caregiver raised a question or concern; details remain private pending clinician review.",
      uncertainty: "NEEDS_REVIEW",
    };
  }
  if (role === "provider") {
    return {
      public_update: "Provider explanation offered; caregiver understanding still needs confirmation.",
      uncertainty: "NEEDS_REVIEW",
    };
  }
  return {
    public_update: "An uncertain-speaker event occurred; meaning and speaker remain unknown.",
    uncertainty: "UNKNOWN",
  };
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createCheckpointChain(hash) {
  let root = "GENESIS";
  let count = 0;
  let generation = 0;
  let tail = Promise.resolve();

  function append(event, activeGeneration = generation) {
    tail = tail.then(async () => {
      const eventHash = await hash(canonicalJson(event));
      if (activeGeneration !== generation) return;
      const nextRoot = await hash(`${root}:${eventHash}`);
      if (activeGeneration !== generation) return;
      root = nextRoot;
      count += 1;
    });
    return tail;
  }

  function reset() {
    generation += 1;
    root = "GENESIS";
    count = 0;
  }

  return {
    append,
    reset,
    settled: () => tail,
    snapshot: () => ({ count, root }),
    token: () => generation,
  };
}

export function canSendAudio(socket, highWatermark = 262_144) {
  return Boolean(
    socket
    && socket.readyState === 1
    && Number(socket.bufferedAmount || 0) <= highWatermark
  );
}

export function voiceWebSocketUrl(runtimeLocation) {
  const scheme = runtimeLocation.protocol === "https:" ? "wss" : "ws";
  const localDevelopment = (
    ["127.0.0.1", "localhost"].includes(runtimeLocation.hostname)
    && runtimeLocation.port === "8080"
  );
  if (localDevelopment) {
    return `${scheme}://${runtimeLocation.hostname}:8081/ws?synthetic=true&consent=true`;
  }
  return `${scheme}://${runtimeLocation.host}/voice/ws?synthetic=true&consent=true`;
}
