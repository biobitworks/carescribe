import { StreamingPcmEncoder } from "./audio-core.mjs";
import {
  canSendAudio,
  createCheckpointChain,
  minimizedPublicUpdate,
  normalizeActor,
  voiceWebSocketUrl,
} from "./voice-core.mjs";

const byId = id => document.getElementById(id);
const els = Object.fromEntries([
  "voice-setup", "actor-name", "actor-role", "room-code", "synthetic-consent",
  "cloud-consent", "connect-voice", "end-voice", "start-mic", "stop-mic",
  "approve-update", "runtime-state", "avatar", "avatar-state", "voice-error",
  "voice-transcript", "checkpoint-count", "checkpoint-root", "mic-status",
  "speaker-roles", "speaker-method", "start-round", "orchestrator-status",
  "orchestrator-model", "continue-round", "pause-round", "stop-round",
  "actor-confirm", "actor-confirm-label", "verify-actor", "actor-receipt",
  "typed-response-form", "typed-response", "send-typed-response",
].map(id => [id, byId(id)]));

let socket;
let actor;
let mediaStream;
let captureContext;
let captureNode;
let playbackContext;
let playbackCursor = 0;
let latestUserTranscript = "";
let guidedStep = -1;
let expectedRole = "";
let advanceReady = false;
let orchestrationBusy = false;
let actorVerified = false;
let roundPaused = false;
const pageRoom = (
  new URLSearchParams(window.location.search).get("room") || "JUDGES"
).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || "JUDGES";

function staticHost() {
  return location.hostname.endsWith("github.io");
}

function setError(message = "") {
  els["voice-error"].hidden = !message;
  els["voice-error"].textContent = message;
}

function setAvatar(state) {
  els.avatar.className = `voice-avatar ${state}`;
  els["avatar-state"].textContent = state || "waiting";
}

function renderSpeaker(role = els["actor-role"].value, live = Boolean(mediaStream)) {
  for (const chip of els["speaker-roles"].querySelectorAll("[data-role]")) {
    chip.classList.toggle("active", chip.dataset.role === role);
    chip.classList.toggle("expected", chip.dataset.role === expectedRole);
    if (chip.dataset.role === role) chip.setAttribute("aria-current", "true");
    else chip.removeAttribute("aria-current");
  }
  els["speaker-roles"].setAttribute(
    "aria-label",
    `${role} is facilitator-selected${expectedRole ? `; ${expectedRole} is being asked` : ""}`,
  );
  const monitor = els["mic-status"].closest(".speaker-monitor");
  monitor.classList.toggle("live", live);
  els["mic-status"].textContent = live
    ? `MIC LIVE · ${role.toUpperCase()} ROLE SELECTED`
    : `MIC OFF · ${role.toUpperCase()} SELECTED`;
}

function resetActorVerification() {
  actorVerified = false;
  els["actor-confirm"].checked = false;
  els["actor-receipt"].hidden = true;
  els["actor-confirm-label"].textContent =
    `I confirm I am acting as ${els["actor-name"].value || "this participant"} · ${els["actor-role"].value} in this fictional demo.`;
  els["start-mic"].disabled = true;
  els["send-typed-response"].disabled = true;
}

async function orchestrateStep(step) {
  if (orchestrationBusy || !socket || socket.readyState !== WebSocket.OPEN) return;
  orchestrationBusy = true;
  els["start-round"].disabled = true;
  els["orchestrator-status"].textContent = "Frontier model is routing the next canonical turn…";
  try {
    const response = await fetch("/api/bedrock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "orchestrate",
        text: JSON.stringify({ step }),
        synthetic: true,
      }),
    });
    if (!response.ok) throw new Error("frontier orchestrator unavailable");
    const result = await response.json();
    const turn = JSON.parse(result.output);
    if (!["provider", "caregiver", "child"].includes(turn.role) || !turn.invitation) {
      throw new Error("invalid orchestrator route");
    }
    stopMicrophone();
    guidedStep = step;
    expectedRole = turn.role;
    els["actor-name"].value = turn.name;
    els["actor-role"].value = turn.role;
    actor = normalizeActor(turn.name, turn.role);
    resetActorVerification();
    renderSpeaker(turn.role);
    sendActorContext();
    els["orchestrator-status"].textContent =
      `ASKING ${turn.name.toUpperCase()} · ${turn.role.toUpperCase()}: ${turn.invitation} NEXT: check “I confirm” and select Verify actor.`;
    els["orchestrator-model"].textContent = `${result.model_id} routed turn ${step + 1} · Nova Sonic voice`;
    checkpoint({
      kind: "frontier-turn-route",
      actor: turn.role,
      model: result.model_id,
      step,
      identification: "operator_selected",
    });
    socket.send(JSON.stringify({
      type: "bidi_text_input",
      text: `Facilitate the synthetic evaluation. Say exactly this invitation and nothing else: ${turn.invitation}`,
    }));
    const turnBoundary = new StreamingPcmEncoder({
      inputRate: 16_000,
      outputRate: 16_000,
      frameSamples: 640,
    });
    for (const frame of turnBoundary.trailingSilence(800)) {
      if (!sendAudioFrame(frame)) break;
    }
    els["actor-confirm"].focus();
    advanceReady = false;
    roundPaused = false;
    els["pause-round"].disabled = false;
    els["stop-round"].disabled = false;
    els["continue-round"].disabled = true;
  } catch (error) {
    setError(`Guided round error: ${error.message}`);
    els["orchestrator-status"].textContent = "Guided round paused. Manual role controls remain available.";
  } finally {
    orchestrationBusy = false;
    els["start-round"].disabled = !socket || socket.readyState !== WebSocket.OPEN;
    els["start-round"].textContent = guidedStep < 0 ? "Start guided round" : "Repeat current prompt";
  }
}

function sendActorContext() {
  if (!actor || !canSendAudio(socket)) return;
  socket.send(JSON.stringify({ type: "actor_context", role: actor.role }));
}

async function verifyActor() {
  setError();
  if (!els["actor-confirm"].checked) {
    return setError("Check the actor confirmation before creating its receipt.");
  }
  try {
    actor = normalizeActor(els["actor-name"].value, els["actor-role"].value);
  } catch (error) {
    return setError(error.message);
  }
  await checkpoint({
    kind: "actor-role-confirmation",
    actor: actor.role,
    room: pageRoom,
    assertion: "fictional_demo_role_selected",
    identity_proof: false,
  });
  actorVerified = true;
  sendActorContext();
  const snapshot = checkpointChain.snapshot();
  els["actor-receipt"].hidden = false;
  els["actor-receipt"].textContent =
    `ROLE RECEIPT · ${actor.role.toUpperCase()} · checkpoint ${snapshot.count} · ${snapshot.root.slice(0, 16)}… · not identity proof`;
  els["actor-receipt"].focus();
  els["start-mic"].disabled = !socket || socket.readyState !== WebSocket.OPEN || roundPaused;
  els["send-typed-response"].disabled =
    !socket || socket.readyState !== WebSocket.OPEN || roundPaused;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

const checkpointChain = createCheckpointChain(digest);

function renderCheckpoint() {
  const { count, root } = checkpointChain.snapshot();
  els["checkpoint-count"].textContent = String(count);
  els["checkpoint-root"].textContent = count ? root : "none";
}

async function checkpoint(event, token = checkpointChain.token()) {
  await checkpointChain.append(event, token);
  renderCheckpoint();
}

function setRuntime(title, detail) {
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = detail;
  els["runtime-state"].replaceChildren(strong, span);
}

function addTranscript(role, text, isFinal, actorRole) {
  if (!text) return;
  if (els["voice-transcript"].querySelector(".empty")) els["voice-transcript"].innerHTML = "";
  const key = role === "assistant" ? "assistant" : "user";
  let line = els["voice-transcript"].querySelector(`[data-live-role="${key}"]`);
  if (!line) {
    line = document.createElement("p");
    line.className = `voice-line ${key}`;
    line.dataset.liveRole = key;
    const label = document.createElement("b");
    const attributedRole = actorRole || actor.role;
    label.textContent = key === "assistant" ? "Advocate" : `${actor.name} · ${attributedRole}`;
    const content = document.createElement("span");
    line.append(label, content);
    els["voice-transcript"].append(line);
  }
  line.querySelector("span").textContent = text;
  if (isFinal) {
    const checkpointToken = checkpointChain.token();
    delete line.dataset.liveRole;
    if (key === "user") {
      latestUserTranscript = text;
      els["approve-update"].disabled = false;
      if (guidedStep >= 0) advanceReady = true;
    }
    digest(text).then(transcriptHash => checkpoint({
      kind: "actor-transcript",
      actor: key === "assistant" ? "advocate" : (actorRole || actor.role),
      disclosure: "LOCAL_ONLY",
      transcript_sha256: transcriptHash,
    }, checkpointToken));
  }
  els["voice-transcript"].scrollTop = els["voice-transcript"].scrollHeight;
}

function clearPlayback() {
  playbackCursor = 0;
  if (playbackContext && playbackContext.state !== "closed") playbackContext.close();
  playbackContext = undefined;
}

async function playPcm(encoded, sampleRate = 16000) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const samples = new Int16Array(bytes.buffer);
  const floats = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    floats[index] = samples[index] / (samples[index] < 0 ? 0x8000 : 0x7fff);
  }
  if (!playbackContext || playbackContext.state === "closed") {
    playbackContext = new AudioContext({ sampleRate });
    playbackCursor = playbackContext.currentTime;
  }
  const buffer = playbackContext.createBuffer(1, floats.length, sampleRate);
  buffer.copyToChannel(floats, 0);
  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  playbackCursor = Math.max(playbackCursor, playbackContext.currentTime);
  source.start(playbackCursor);
  playbackCursor += buffer.duration;
}

function handleVoiceEvent(event) {
  if (event.type === "bidi_connection_start") {
    setRuntime("Nova Sonic connected", `${event.model} · Bedrock us-east-1 · raw audio cloud boundary`);
    els["start-mic"].disabled = !actorVerified;
    els["send-typed-response"].disabled = !actorVerified;
    els["end-voice"].disabled = false;
    els["start-round"].disabled = false;
    checkpoint({ kind: "model-invocation", actor: "amazon-bedrock", model: event.model, disclosure: "REMOTE_AUDIO" });
    sendActorContext();
  } else if (event.type === "actor_context_ack") {
    renderSpeaker(event.role);
    els["speaker-method"].textContent = `${event.role} acknowledged by orchestrator · operator-selected`;
    checkpoint({ kind: "actor-handoff", actor: event.role, identification: event.identification });
  } else if (event.type === "bidi_transcript_stream") {
    addTranscript(event.role, event.text, event.is_final, event.actor_role);
  } else if (event.type === "bidi_audio_start") {
    setAvatar("speaking");
  } else if (event.type === "bidi_audio_stream" && event.audio) {
    playPcm(event.audio, event.sample_rate).catch(() => setError("Audio playback failed."));
  } else if (event.type === "bidi_audio_stop") {
    if (!mediaStream) setAvatar("");
    if (advanceReady) {
      advanceReady = false;
      if (guidedStep < 3) {
        orchestrateStep(guidedStep + 1);
      } else {
        expectedRole = "";
        renderSpeaker(actor.role);
        els["orchestrator-status"].textContent = "Guided round complete · all three actors responded.";
        els["start-round"].textContent = "Run guided round again";
        guidedStep = -1;
      }
    }
  } else if (event.type === "bidi_interruption") {
    clearPlayback();
    setAvatar(mediaStream ? "listening" : "");
    checkpoint({ kind: "model-interruption", reason: event.reason || "user_speech" });
  } else if (event.type === "bidi_connection_restart") {
    checkpoint({ kind: "model-restart", reason: event.reason, turn_interrupted: Boolean(event.turn_interrupted) });
  } else if (event.type === "protocol_error" || event.type === "upstream_error") {
    setError(event.message || `Voice bridge error: ${event.code}`);
  }
}

function voiceUrl() {
  return voiceWebSocketUrl(location);
}

async function connect(event) {
  event.preventDefault();
  setError();
  if (staticHost()) {
    setError("The public Pages site is static. Start the laptop bridge and use the local voice page.");
    return;
  }
  if (!els["synthetic-consent"].checked || !els["cloud-consent"].checked) {
    setError("Both fictional-data and cloud-audio acknowledgements are required.");
    return;
  }
  try {
    actor = normalizeActor(els["actor-name"].value, els["actor-role"].value);
  } catch (error) {
    setError(error.message);
    return;
  }
  els["connect-voice"].disabled = true;
  socket = new WebSocket(voiceUrl());
  socket.onmessage = message => {
    try { handleVoiceEvent(JSON.parse(message.data)); }
    catch { setError("The voice bridge returned an invalid event."); }
  };
  socket.onerror = () => setError("Could not connect to the local Nova Sonic bridge on port 8081.");
  socket.onclose = () => {
    stopMicrophone({ record: false, sendSilence: false });
    els["connect-voice"].disabled = false;
    els["start-mic"].disabled = true;
    els["send-typed-response"].disabled = true;
    els["end-voice"].disabled = true;
    els["start-round"].disabled = true;
    setAvatar("");
  };
}

async function startMicrophone() {
  setError();
  if (!socket || socket.readyState !== WebSocket.OPEN) return setError("Connect the advocate first.");
  if (!actorVerified) return setError("Confirm and verify the selected fictional actor first.");
  if (roundPaused) return setError("Continue the guided round before starting the microphone.");
  if (!els["synthetic-consent"].checked || !els["cloud-consent"].checked) {
    return setError("Consent was revoked. Reconnect after both acknowledgements.");
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
    });
    captureContext = new AudioContext({ sampleRate: 16000 });
    if (!playbackContext || playbackContext.state === "closed") {
      playbackContext = new AudioContext({ sampleRate: 16000 });
    }
    await Promise.all([captureContext.resume(), playbackContext.resume()]);
    await captureContext.audioWorklet.addModule("audio-capture.worklet.js");
    const source = captureContext.createMediaStreamSource(mediaStream);
    captureNode = new AudioWorkletNode(captureContext, "carescribe-audio-capture");
    const silent = captureContext.createGain();
    silent.gain.value = 0;
    captureNode.port.onmessage = message => {
      if (message.data.type !== "audio") return;
      if (!sendAudioFrame(message.data.pcm)) {
        setError("Audio paused because the network buffer is full.");
        stopMicrophone({ record: true, sendSilence: false });
      }
    };
    source.connect(captureNode);
    captureNode.connect(silent).connect(captureContext.destination);
    els["start-mic"].disabled = true;
    els["stop-mic"].disabled = false;
    setAvatar("listening");
    renderSpeaker(actor.role, true);
    checkpoint({ kind: "microphone-start", actor: actor.role, disclosure: "REMOTE_AUDIO" });
  } catch (error) {
    setError(`Microphone error: ${error.message}`);
  }
}

function sendAudioFrame(pcm) {
  if (!canSendAudio(socket)) return false;
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  socket.send(JSON.stringify({
    type: "bidi_audio_input",
    audio: bytesToBase64(bytes),
    format: "pcm",
    sample_rate: 16000,
    channels: 1,
  }));
  return true;
}

function stopMicrophone({ record = true, sendSilence = true } = {}) {
  const wasActive = Boolean(mediaStream);
  if (sendSilence && mediaStream && canSendAudio(socket)) {
    const silence = new StreamingPcmEncoder({
      inputRate: 16_000,
      outputRate: 16_000,
      frameSamples: 640,
    });
    for (const frame of silence.trailingSilence(800)) {
      if (!sendAudioFrame(frame)) break;
    }
  }
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  if (captureNode) captureNode.disconnect();
  if (captureContext && captureContext.state !== "closed") captureContext.close();
  mediaStream = undefined;
  captureNode = undefined;
  captureContext = undefined;
  els["stop-mic"].disabled = true;
  els["start-mic"].disabled =
    !actorVerified || roundPaused || !socket || socket.readyState !== WebSocket.OPEN;
  els["send-typed-response"].disabled =
    !actorVerified || roundPaused || !socket || socket.readyState !== WebSocket.OPEN;
  if (record && wasActive && socket?.readyState === WebSocket.OPEN) {
    checkpoint({ kind: "microphone-stop", actor: actor?.role || "uncertain" });
  }
  setAvatar("");
  renderSpeaker(actor?.role);
}

async function approveUpdate() {
  if (!latestUserTranscript) return;
  const update = minimizedPublicUpdate(actor.role);
  const room = String(els["room-code"].value || "").trim().slice(0, 12);
  if (!room) return setError("Enter a room code before approving.");
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room, role: actor.role, ...update, synthetic: true }),
  });
  if (!response.ok) return setError("The local room backend rejected the minimized update.");
  latestUserTranscript = "";
  guidedStep = -1;
  expectedRole = "";
  advanceReady = false;
  els["approve-update"].disabled = true;
  checkpoint({ kind: "approved-public-update", actor: actor.role, room, ...update });
}

function sendTypedResponse(event) {
  event.preventDefault();
  setError();
  if (!actorVerified) return setError("Confirm and verify the selected fictional actor first.");
  if (roundPaused) return setError("Continue the guided round before sending a response.");
  if (!socket || socket.readyState !== WebSocket.OPEN) return setError("Connect the advocate first.");
  const text = els["typed-response"].value.trim();
  if (!text) return setError("Enter a fictional fallback response.");
  addTranscript("user", text, true, actor.role);
  socket.send(JSON.stringify({ type: "bidi_text_input", text }));
  const turnBoundary = new StreamingPcmEncoder({
    inputRate: 16_000,
    outputRate: 16_000,
    frameSamples: 640,
  });
  for (const frame of turnBoundary.trailingSilence(800)) {
    if (!sendAudioFrame(frame)) break;
  }
  checkpoint({ kind: "typed-response-fallback", actor: actor.role, disclosure: "REMOTE_TEXT" });
  els["typed-response"].value = "";
}

function endSession() {
  checkpointChain.reset();
  stopMicrophone({ record: false, sendSilence: false });
  clearPlayback();
  if (socket) socket.close(1000, "user ended private session");
  socket = undefined;
  latestUserTranscript = "";
  actorVerified = false;
  roundPaused = false;
  els["send-typed-response"].disabled = true;
  renderCheckpoint();
  els["voice-transcript"].innerHTML = '<p class="empty">Private transcript cleared.</p>';
  els["approve-update"].disabled = true;
  setRuntime("Private session ended", "DOM transcript and session-local checkpoint chain cleared.");
}

els["voice-setup"].addEventListener("submit", connect);
els["start-mic"].addEventListener("click", startMicrophone);
els["stop-mic"].addEventListener("click", () => stopMicrophone());
els["approve-update"].addEventListener("click", () => approveUpdate().catch(() => setError("Room publication failed.")));
els["end-voice"].addEventListener("click", endSession);
els["start-round"].addEventListener("click", () => orchestrateStep(guidedStep < 0 ? 0 : guidedStep));
els["verify-actor"].addEventListener("click", () => verifyActor());
els["typed-response-form"].addEventListener("submit", sendTypedResponse);
els["continue-round"].addEventListener("click", () => {
  roundPaused = false;
  els["continue-round"].disabled = true;
  els["pause-round"].disabled = guidedStep < 0;
  els["start-mic"].disabled = !actorVerified;
  els["send-typed-response"].disabled = !actorVerified;
  els["orchestrator-status"].textContent = guidedStep < 0
    ? "Ready to start a guided round."
    : `Round resumed · ${actor.name} may respond.`;
});
els["pause-round"].addEventListener("click", () => {
  stopMicrophone();
  roundPaused = true;
  els["continue-round"].disabled = false;
  els["pause-round"].disabled = true;
  els["start-mic"].disabled = true;
  els["send-typed-response"].disabled = true;
  els["orchestrator-status"].textContent = "Guided round paused · no microphone capture.";
});
els["stop-round"].addEventListener("click", () => {
  stopMicrophone();
  guidedStep = -1;
  expectedRole = "";
  advanceReady = false;
  roundPaused = false;
  actorVerified = false;
  resetActorVerification();
  renderSpeaker(actor?.role);
  els["continue-round"].disabled = true;
  els["pause-round"].disabled = true;
  els["stop-round"].disabled = true;
  els["start-round"].textContent = "Start guided round";
  els["orchestrator-status"].textContent = "Guided round stopped · private session remains connected.";
});
els["actor-role"].addEventListener("change", () => {
  if (mediaStream) {
    els["actor-role"].value = actor.role;
    return setError("Pause the microphone before handing off to another actor.");
  }
  try {
    actor = normalizeActor(els["actor-name"].value, els["actor-role"].value);
    resetActorVerification();
    renderSpeaker(actor.role);
    sendActorContext();
  } catch (error) {
    setError(error.message);
  }
});
els["actor-name"].addEventListener("input", resetActorVerification);
window.addEventListener("pagehide", () => {
  checkpointChain.reset();
  stopMicrophone({ record: false, sendSilence: false });
  if (socket) socket.close();
});

for (const consentId of ["synthetic-consent", "cloud-consent"]) {
  els[consentId].addEventListener("change", () => {
    if (socket && !els[consentId].checked) endSession();
  });
}

if (staticHost()) {
  setRuntime("Static presentation only", "No WebSocket or model runs on GitHub Pages.");
  els["connect-voice"].disabled = true;
}
els["room-code"].value = pageRoom;
for (const link of document.querySelectorAll('nav a[href$=".html"]')) {
  const url = new URL(link.href);
  url.searchParams.set("room", pageRoom);
  link.href = url.toString();
}
resetActorVerification();
renderSpeaker();
