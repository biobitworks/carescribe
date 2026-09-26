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
