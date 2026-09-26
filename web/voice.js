import { canonicalJson, minimizedPublicUpdate, normalizeActor } from "./voice-core.mjs";

const byId = id => document.getElementById(id);
const els = Object.fromEntries([
  "voice-setup", "actor-name", "actor-role", "room-code", "synthetic-consent",
  "cloud-consent", "connect-voice", "end-voice", "start-mic", "stop-mic",
  "approve-update", "runtime-state", "avatar", "avatar-state", "voice-error",
  "voice-transcript", "checkpoint-count", "checkpoint-root",
].map(id => [id, byId(id)]));

let socket;
let actor;
let mediaStream;
let captureContext;
let captureNode;
let playbackContext;
let playbackCursor = 0;
let latestUserTranscript = "";
let checkpointRoot = "GENESIS";
let checkpointCount = 0;
let generation = 0;

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

async function checkpoint(event, activeGeneration = generation) {
  const eventHash = await digest(canonicalJson(event));
  const nextRoot = await digest(`${checkpointRoot}:${eventHash}`);
  if (activeGeneration !== generation) return;
  checkpointRoot = nextRoot;
  checkpointCount += 1;
  els["checkpoint-count"].textContent = String(checkpointCount);
  els["checkpoint-root"].textContent = nextRoot;
}

function addTranscript(role, text, isFinal) {
  if (!text) return;
  if (els["voice-transcript"].querySelector(".empty")) els["voice-transcript"].innerHTML = "";
  const key = role === "assistant" ? "assistant" : "user";
  let line = els["voice-transcript"].querySelector(`[data-live-role="${key}"]`);
  if (!line) {
    line = document.createElement("p");
    line.className = `voice-line ${key}`;
    line.dataset.liveRole = key;
    const label = document.createElement("b");
    label.textContent = key === "assistant" ? "Advocate" : `${actor.name} · ${actor.role}`;
    const content = document.createElement("span");
    line.append(label, content);
    els["voice-transcript"].append(line);
  }
  line.querySelector("span").textContent = text;
  if (isFinal) {
    delete line.dataset.liveRole;
    if (key === "user") {
      latestUserTranscript = text;
      els["approve-update"].disabled = false;
    }
    digest(text).then(transcriptHash => checkpoint({
      kind: "actor-transcript",
      actor: key === "assistant" ? "advocate" : actor.role,
      disclosure: "LOCAL_ONLY",
      transcript_sha256: transcriptHash,
    }));
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
    els["runtime-state"].innerHTML = `<strong>Nova Sonic connected</strong><span>${event.model} · Bedrock us-east-1 · raw audio cloud boundary</span>`;
    els["start-mic"].disabled = false;
    els["end-voice"].disabled = false;
    checkpoint({ kind: "model-invocation", actor: "amazon-bedrock", model: event.model, disclosure: "REMOTE_AUDIO" });
  } else if (event.type === "bidi_transcript_stream") {
    addTranscript(event.role, event.text, event.is_final);
  } else if (event.type === "bidi_audio_start") {
    setAvatar("speaking");
  } else if (event.type === "bidi_audio_stream" && event.audio) {
    playPcm(event.audio, event.sample_rate).catch(() => setError("Audio playback failed."));
  } else if (event.type === "bidi_audio_stop") {
    if (!mediaStream) setAvatar("");
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
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const host = location.hostname || "127.0.0.1";
  return `${scheme}://${host}:8081/ws?synthetic=true&consent=true`;
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
    stopMicrophone();
    els["connect-voice"].disabled = false;
    els["start-mic"].disabled = true;
    els["end-voice"].disabled = true;
    setAvatar("");
  };
}

async function startMicrophone() {
  setError();
  if (!socket || socket.readyState !== WebSocket.OPEN) return setError("Connect the advocate first.");
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
    });
    captureContext = new AudioContext({ sampleRate: 16000 });
    await captureContext.audioWorklet.addModule("audio-capture.worklet.js");
    const source = captureContext.createMediaStreamSource(mediaStream);
    captureNode = new AudioWorkletNode(captureContext, "carescribe-audio-capture");
    const silent = captureContext.createGain();
    silent.gain.value = 0;
    captureNode.port.onmessage = message => {
      if (message.data.type !== "audio" || socket.readyState !== WebSocket.OPEN) return;
      const bytes = new Uint8Array(message.data.pcm.buffer);
      socket.send(JSON.stringify({
        type: "bidi_audio_input",
        audio: bytesToBase64(bytes),
        format: "pcm",
        sample_rate: 16000,
        channels: 1,
      }));
    };
    source.connect(captureNode);
    captureNode.connect(silent).connect(captureContext.destination);
    els["start-mic"].disabled = true;
    els["stop-mic"].disabled = false;
    setAvatar("listening");
    checkpoint({ kind: "microphone-start", actor: actor.role, disclosure: "REMOTE_AUDIO" });
  } catch (error) {
    setError(`Microphone error: ${error.message}`);
  }
}

function stopMicrophone() {
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  if (captureNode) captureNode.disconnect();
  if (captureContext && captureContext.state !== "closed") captureContext.close();
  mediaStream = undefined;
  captureNode = undefined;
  captureContext = undefined;
  els["stop-mic"].disabled = true;
  els["start-mic"].disabled = !socket || socket.readyState !== WebSocket.OPEN;
  if (socket?.readyState === WebSocket.OPEN) checkpoint({ kind: "microphone-stop", actor: actor?.role || "uncertain" });
  setAvatar("");
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
  els["approve-update"].disabled = true;
  checkpoint({ kind: "approved-public-update", actor: actor.role, room, ...update });
}

function endSession() {
  generation += 1;
  stopMicrophone();
  clearPlayback();
  if (socket) socket.close(1000, "user ended private session");
  socket = undefined;
  latestUserTranscript = "";
  checkpointRoot = "GENESIS";
  checkpointCount = 0;
  els["checkpoint-count"].textContent = "0";
  els["checkpoint-root"].textContent = "none";
  els["voice-transcript"].innerHTML = '<p class="empty">Private transcript cleared.</p>';
  els["approve-update"].disabled = true;
  els["runtime-state"].innerHTML = "<strong>Private session ended</strong><span>DOM transcript and session-local checkpoint chain cleared.</span>";
}

els["voice-setup"].addEventListener("submit", connect);
els["start-mic"].addEventListener("click", startMicrophone);
els["stop-mic"].addEventListener("click", stopMicrophone);
els["approve-update"].addEventListener("click", () => approveUpdate().catch(() => setError("Room publication failed.")));
els["end-voice"].addEventListener("click", endSession);
window.addEventListener("pagehide", () => {
  stopMicrophone();
  if (socket) socket.close();
});

if (staticHost()) {
  els["runtime-state"].innerHTML = "<strong>Static presentation only</strong><span>No WebSocket or model runs on GitHub Pages.</span>";
}
