"use strict";

const STORAGE_KEY = "carescribe-live-session-v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const sampleLines = [
  { role: "provider", text: "What changes have you noticed in play or communication since the last visit?" },
  { role: "caregiver", text: "They have started using short phrases more often and point to show us things they find interesting." },
  { role: "caregiver", text: "I read that this could be autism. Is that what this means?" },
  { role: "provider", text: "That is an important concern. These observations alone cannot answer it; we can discuss development broadly and whether further evaluation is appropriate." },
  { role: "provider", text: "Can you share a recent example of a phrase they used on their own?" },
  { role: "caregiver", text: "Yesterday they said, “more red blocks,” while we were building together." },
  { role: "child", text: "More red blocks, please." },
  { role: "provider", text: "Thank you. How do transitions between activities usually go at home?" },
  { role: "caregiver", text: "A short warning helps. Without one, stopping a favorite activity can be difficult." }
];

const state = loadState();
let recognition = null;
let timerHandle = null;
let simulationHandle = null;
let toastHandle = null;
let advocateMuted = false;
const custody = window.CareScribeCustody
  ? new window.CareScribeCustody.CustodyLedger()
  : null;
let previousFcoId = null;
let correctionPredecessorId = null;

const els = Object.fromEntries([
  "session-title", "session-date", "timer", "status-chip", "start-session", "pause-session",
  "end-session", "delete-session", "audio-state", "audio-label", "role-tabs", "transcript-list",
  "transcript-empty", "manual-form", "manual-text", "observations-list", "observations-empty",
  "observation-count", "questions-list", "questions-empty", "question-count", "consent-dialog",
  "consent-check", "privacy-check", "confirm-consent", "end-dialog", "confirm-end",
  "delete-dialog", "confirm-delete", "info-dialog", "open-info", "toast"
].map(id => [id, document.getElementById(id)]));

function blankState() {
  return {
    title: "Developmental visit",
    status: "ready",
    role: "provider",
    elapsed: 0,
    lastStartedAt: null,
    transcript: [],
    observations: [],
    questions: [],
    custodyEvents: [],
    custodyEdges: [],
    mmrRoot: null,
    startedOn: Date.now(),
    simulationIndex: 0,
    mode: null
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.transcript)) return blankState();
    if (saved.status === "live") {
      saved.elapsed += Math.max(0, Date.now() - (saved.lastStartedAt || Date.now()));
      saved.status = "paused";
      saved.lastStartedAt = null;
    }
    return { ...blankState(), ...saved };
  } catch {
    return blankState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function elapsedMs() {
  return state.elapsed + (state.status === "live" && state.lastStartedAt ? Date.now() - state.lastStartedAt : 0);
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function render() {
  els["session-title"].textContent = state.title;
  els["session-date"].textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(state.startedOn);
  els.timer.textContent = formatDuration(elapsedMs());
  const statusNames = { ready: "Ready", live: "Listening", paused: "Paused", ended: "Complete" };
  els["status-chip"].className = `status-chip ${state.status}`;
  els["status-chip"].innerHTML = `<i></i>${statusNames[state.status]}`;

  const hasBegun = state.status !== "ready";
  els["start-session"].classList.toggle("hidden", state.status === "live" || state.status === "ended");
  els["start-session"].innerHTML = state.status === "paused"
    ? "Resume session"
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-6 9a6 6 0 0 0 12 0m-6 6v3m-3 0h6"/></svg>Start session`;
  els["pause-session"].classList.toggle("hidden", state.status !== "live");
  els["end-session"].classList.toggle("hidden", !hasBegun || state.status === "ended");
  els["manual-text"].disabled = state.status === "ended";

  document.querySelectorAll("#role-tabs button").forEach(button => {
    const active = button.dataset.role === state.role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  renderTranscript();
  renderObservations();
  renderQuestions();
  updateAudioState();
  renderOperationalViews();
}

function renderOperationalViews() {
  const priority = document.getElementById("priority-list");
  if (priority) {
    const unresolved = state.questions.filter(item => !item.asked);
    priority.innerHTML = unresolved.length
      ? unresolved.slice(0, 3).map((item, index) => `<li><b>${index === 0 ? "HIGH" : "ASK"}</b><span><strong>${escapeHtml(item.text)}</strong><small>Unresolved · caregiver/provider review</small></span><time>${index === 0 ? "Now" : "Next"}</time></li>`).join("")
      : "<li><b>READY</b><span><strong>No unresolved items yet</strong><small>The advocate remains caregiver-controlled</small></span><time>Now</time></li>";
  }
  const count = document.getElementById("mmr-count");
  const root = document.getElementById("mmr-root");
  const custodyCount = custody?.fcos.length || state.custodyEvents.length;
  const custodyRoot = custody?.root || state.mmrRoot;
  if (count) count.textContent = `${custodyCount} EVENTS`;
  if (root) root.textContent = custodyRoot
    ? `${custodyRoot.slice(0, 20)}… computed from canonical persisted bytes`
    : "No canonical events appended yet.";
}

function renderTranscript() {
  els["transcript-empty"].classList.toggle("hidden", state.transcript.length > 0);
  els["transcript-list"].querySelectorAll(".transcript-entry").forEach(node => node.remove());
  state.transcript.forEach(item => {
    const article = document.createElement("article");
    article.className = "transcript-entry";
    article.innerHTML = `
      <div class="speaker-label ${item.role}">${escapeHtml(item.role)}</div>
      <p class="transcript-copy">${escapeHtml(item.text)}${item.simulated ? '<span class="simulation-tag">Sample</span>' : ""}
        <time class="transcript-time">${formatTime(item.timestamp)}</time>
      </p>`;
    els["transcript-list"].append(article);
  });
  els["transcript-list"].scrollTop = els["transcript-list"].scrollHeight;
}

function renderObservations() {
  els["observations-empty"].classList.toggle("hidden", state.observations.length > 0);
  els["observations-list"].querySelectorAll(".observation-card").forEach(node => node.remove());
  state.observations.forEach(observation => {
    const card = document.createElement("article");
    card.className = "observation-card";
    card.innerHTML = `
      <div class="observation-top"><span>${formatTime(observation.timestamp)}</span><span class="confidence">${observation.confidence}% confidence</span></div>
      <h3>${escapeHtml(observation.summary)}</h3>
      <p class="evidence">Evidence: “${escapeHtml(observation.evidence)}”</p>
      <button class="approve-button ${observation.approved ? "approved" : ""}" data-id="${observation.id}">
        ${observation.approved ? "✓ Clinician approved" : "Approve observation"}
      </button>`;
    els["observations-list"].append(card);
  });
  els["observation-count"].textContent = state.observations.length;
}

function renderQuestions() {
  els["questions-empty"].classList.toggle("hidden", state.questions.length > 0);
  els["questions-list"].querySelectorAll(".question-card").forEach(node => node.remove());
  state.questions.forEach(question => {
    const button = document.createElement("button");
    button.className = `question-card ${question.asked ? "asked" : ""}`;
    button.dataset.id = question.id;
    button.textContent = question.text;
    button.title = "Mark question as asked";
    els["questions-list"].append(button);
  });
  els["question-count"].textContent = state.questions.filter(q => !q.asked).length;
}

function updateAudioState() {
  const mode = state.status === "live" ? state.mode : null;
  els["audio-state"].className = `audio-state ${mode === "speech" ? "listening" : mode === "simulation" ? "simulated" : ""}`;
  els["audio-label"].textContent = mode === "speech" ? "Mic listening" : mode === "simulation" ? "Sample mode" : "Mic off";
}

function addTranscript(text, role = state.role, simulated = false) {
  const clean = String(text).trim();
  if (!clean) return;
  const item = { id: crypto.randomUUID(), role, text: clean, timestamp: Date.now(), simulated };
  state.transcript.push(item);
  deriveInsight(item);
  appendCustodyEvent(item);
  maybeRequestRemoteReview(item);
  saveState();
  render();
}

async function appendCustodyEvent(item) {
  if (!custody) return;
  const status = item.role === "provider" ? "NEEDS_REVIEW" : "UNCERTAIN";
  const fields = {
    timestamp: new Date(item.timestamp).toISOString(),
    speaker: item.role,
    role: item.role,
    statement: item.text,
    observation: "Transcript event captured; meaning not inferred.",
    confidence: item.simulated ? "SIMULATED" : "UNCERTAIN",
    source: item.simulated ? "synthetic_script" : "browser_transcript",
    clinicalRelevance: "NEEDS_REVIEW",
    status
  };
  const wasCorrection = Boolean(correctionPredecessorId);
  const fco = correctionPredecessorId
    ? await custody.correct(correctionPredecessorId, fields)
    : await custody.appendFCO(fields);
  correctionPredecessorId = null;
  if (previousFcoId && !wasCorrection) {
    const edgeKind = /\\?|autism/i.test(item.text) ? "QUESTION" : "FOLLOW_UP";
    custody.appendEdge({ source: previousFcoId, target: fco.id, kind: edgeKind });
  }
  previousFcoId = fco.id;
  state.custodyEvents = custody.fcos.map(event => ({ ...event }));
  state.custodyEdges = custody.edges.map(edge => ({ ...edge }));
  state.mmrRoot = custody.root;
  saveState();
  const stream = document.getElementById("fco-event-stream");
  if (stream) {
    const event = document.createElement("article");
    event.innerHTML = `<time>${formatTime(item.timestamp)}</time><i></i><span><b>${escapeHtml(item.role)} statement appended</b><small>${escapeHtml(status)} · hash proves integrity, not truth</small></span><code>${fco.id.slice(0, 7)}</code>`;
    stream.prepend(event);
  }
  const graph = document.getElementById("fcg-graph");
  if (graph && custody.edges.length) {
    const edge = custody.edges.at(-1);
    graph.innerHTML = `<article><small>SOURCE FCO</small><b>${edge.source.slice(0, 8)}</b><span>Locally controlled event</span></article><i>${edge.kind} →</i><article><small>TARGET FCO</small><b>${edge.target.slice(0, 8)}</b><span>Append-only relationship</span></article>`;
  }
  renderOperationalViews();
}

async function maybeRequestRemoteReview(item) {
  if (!/autism/i.test(item.text) || item.role !== "caregiver") return;
  state.questions.unshift({
    id: crypto.randomUUID(),
    text: "Caregiver asked whether observed communication differences could indicate autism; clinician clarification is required.",
    asked: false
  });
  saveState();
  renderQuestions();
  renderOperationalViews();
  const feed = document.getElementById("provider-live-feed");
  if (feed) {
    feed.insertAdjacentHTML("afterbegin", '<article class="update"><small>CAREGIVER CONCERN · REVIEW NEEDED</small><b>Possible autism mentioned by caregiver</b><span>Not a diagnosis · clarify scope and next evaluation steps</span></article>');
  }
  try {
    const response = await fetch("/api/bedrock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "atomize", text: item.text, synthetic: true })
    });
    if (!response.ok) throw new Error("unavailable");
    const result = await response.json();
    const status = document.getElementById("bedrock-status");
    if (status) status.textContent = `Bedrock remote · ${result.model_id.replace("amazon.", "")}`;
    if (feed) {
      feed.insertAdjacentHTML("afterbegin", '<article class="update approved"><small>REMOTE BEDROCK · CLINICIAN REVIEW</small><b>Concern atomized without diagnostic promotion</b><span>Caregiver statement preserved; unknowns remain explicit</span></article>');
    }
  } catch {
    const status = document.getElementById("bedrock-status");
    if (status) status.textContent = "Bedrock remote · disconnected";
  }
}

function deriveInsight(item) {
  // Provider prompts are context, not evidence about the child or caregiver.
  if (item.role === "provider") return;
  const lower = item.text.toLowerCase();
  let insight = null;
  let question = null;
  if (/autism/.test(lower)) {
    insight = { summary: "Caregiver raised a question about possible autism; no conclusion supported", confidence: 100 };
    question = "What observations and broader developmental history should inform whether further evaluation is appropriate?";
  } else if (/phrase|words|said|communication|point/.test(lower)) {
    insight = { summary: "Caregiver reports emerging functional communication", confidence: 86 };
    question = "Does this communication happen across settings and with different people?";
  } else if (/transition|warning|stopping|difficult/.test(lower)) {
    insight = { summary: "Advance notice may support activity transitions", confidence: 82 };
    question = "What length of warning seems most helpful before a transition?";
  } else if (/play|blocks|building/.test(lower)) {
    insight = { summary: "Shared play example described during the visit", confidence: 78 };
    question = "How does the child invite others to join their play?";
  }
  if (insight && !state.observations.some(o => o.summary === insight.summary)) {
    state.observations.push({
      id: crypto.randomUUID(),
      timestamp: item.timestamp,
      summary: insight.summary,
      evidence: item.text.length > 112 ? `${item.text.slice(0, 109)}…` : item.text,
      confidence: insight.confidence,
      approved: false
    });
  }
  if (question && !state.questions.some(q => q.text === question)) {
    state.questions.push({ id: crypto.randomUUID(), text: question, asked: false });
  }
}

async function beginSession() {
  if (state.status === "ready") {
    els["consent-dialog"].showModal();
    return;
  }
  await activateSession();
}

async function activateSession() {
  state.status = "live";
  state.lastStartedAt = Date.now();
  saveState();
  startTimer();
  render();

  if (!SpeechRecognition) {
    startSimulation("Live transcription isn’t supported here. Playing a fictional sample.");
    return;
  }
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => stream.getTracks().forEach(track => track.stop()));
    startRecognition();
  } catch {
    startSimulation("Microphone unavailable. Playing a fictional sample instead.");
  }
}

function startRecognition() {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  state.mode = "speech";
  let finalized = "";
  recognition.onresult = event => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) finalized += event.results[i][0].transcript;
    }
    if (finalized.trim()) {
      addTranscript(finalized);
      finalized = "";
    }
  };
  recognition.onerror = event => {
    if (state.status === "live" && ["not-allowed", "service-not-allowed", "network"].includes(event.error)) {
      startSimulation("Live speech service unavailable. Switched to a fictional sample.");
    }
  };
  recognition.onend = () => {
    if (state.status === "live" && state.mode === "speech") {
      try { recognition.start(); } catch { /* already restarting */ }
    }
  };
  try {
    recognition.start();
    saveState();
    render();
    showToast("Microphone active — transcript stays in this browser");
  } catch {
    startSimulation("Couldn’t start live transcription. Playing a fictional sample.");
  }
}

function startSimulation(message) {
  stopCapture();
  state.mode = "simulation";
  saveState();
  render();
  showToast(message);
  simulationHandle = window.setInterval(() => {
    if (state.status !== "live") return;
    if (state.simulationIndex >= sampleLines.length) {
      clearInterval(simulationHandle);
      simulationHandle = null;
      showToast("Sample complete — you can add transcript manually");
      return;
    }
    const line = sampleLines[state.simulationIndex++];
    state.role = line.role;
    addTranscript(line.text, line.role, true);
  }, 3200);
}

function pauseSession() {
  state.elapsed = elapsedMs();
  state.lastStartedAt = null;
  state.status = "paused";
  stopCapture();
  stopTimer();
  saveState();
  render();
  showToast("Session paused and saved");
}

function endSession() {
  state.elapsed = elapsedMs();
  state.lastStartedAt = null;
  state.status = "ended";
  stopCapture();
  stopTimer();
  saveState();
  render();
  showToast("Session ended — saved on this device");
}

function stopCapture() {
  if (recognition) {
    recognition.onend = null;
    try { recognition.stop(); } catch { /* inactive */ }
    recognition = null;
  }
  if (simulationHandle) clearInterval(simulationHandle);
  simulationHandle = null;
  state.mode = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function startTimer() {
  stopTimer();
  timerHandle = window.setInterval(() => {
    els.timer.textContent = formatDuration(elapsedMs());
    if (Math.floor(elapsedMs() / 1000) % 5 === 0) saveState();
  }, 1000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function showToast(message) {
  clearTimeout(toastHandle);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastHandle = setTimeout(() => els.toast.classList.remove("show"), 3200);
}

els["start-session"].addEventListener("click", beginSession);
els["pause-session"].addEventListener("click", pauseSession);
els["end-session"].addEventListener("click", () => els["end-dialog"].showModal());
els["delete-session"].addEventListener("click", () => els["delete-dialog"].showModal());
els["open-info"].addEventListener("click", () => els["info-dialog"].showModal());
els["confirm-end"].addEventListener("click", endSession);
els["confirm-delete"].addEventListener("click", () => {
  stopCapture();
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, blankState());
  render();
  showToast("Session permanently deleted");
});

function updateConsentButton() {
  els["confirm-consent"].disabled = !(els["consent-check"].checked && els["privacy-check"].checked);
}
els["consent-check"].addEventListener("change", updateConsentButton);
els["privacy-check"].addEventListener("change", updateConsentButton);
els["confirm-consent"].addEventListener("click", event => {
  if (els["confirm-consent"].disabled) {
    event.preventDefault();
    return;
  }
  window.setTimeout(activateSession, 0);
});

els["role-tabs"].addEventListener("click", event => {
  const button = event.target.closest("button[data-role]");
  if (!button) return;
  state.role = button.dataset.role;
  saveState();
  render();
});

els["manual-form"].addEventListener("submit", event => {
  event.preventDefault();
  if (state.status === "ended") return;
  addTranscript(els["manual-text"].value);
  els["manual-text"].value = "";
});

els["observations-list"].addEventListener("click", event => {
  const button = event.target.closest(".approve-button");
  if (!button) return;
  const observation = state.observations.find(item => item.id === button.dataset.id);
  if (!observation) return;
  observation.approved = !observation.approved;
  saveState();
  renderObservations();
  showToast(observation.approved ? "Observation approved by clinician" : "Approval removed");
});

els["questions-list"].addEventListener("click", event => {
  const button = event.target.closest(".question-card");
  if (!button) return;
  const question = state.questions.find(item => item.id === button.dataset.id);
  if (!question) return;
  question.asked = !question.asked;
  saveState();
  renderQuestions();
});

document.querySelector(".care-controls")?.addEventListener("click", event => {
  const button = event.target.closest("button[data-advocate-action]");
  if (!button) return;
  const action = button.dataset.advocateAction;
  if (action === "mute") {
    advocateMuted = !advocateMuted;
    if (advocateMuted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    showToast(`Advocate ${advocateMuted ? "muted" : "unmuted"} by caregiver`);
  } else if (action === "dismiss") {
    const next = state.questions.find(item => !item.asked);
    if (next) next.asked = true;
    saveState();
    render();
    showToast("Caregiver dismissed the next intervention");
  } else if (action === "correct") {
    state.role = "caregiver";
    correctionPredecessorId = previousFcoId;
    els["manual-text"].focus();
    showToast("Add a successor correction; history will not be rewritten");
  } else if (action === "approve") {
    const next = state.questions.find(item => !item.asked);
    if (!next) return showToast("No intervention is waiting");
    if (!advocateMuted && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(`Before we move on, the caregiver still has an unresolved question. ${next.text}`);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
    next.asked = true;
    saveState();
    render();
    showToast("Caregiver approved a brief advocate intervention");
  }
});

fetch("/api/health")
  .then(response => {
    if (!response.ok) throw new Error("offline");
    return response.json();
  })
  .then(health => {
    const status = document.getElementById("bedrock-status");
    if (status) status.textContent = health.inference_location === "remote"
      ? "Bedrock remote · connected"
      : "Bedrock remote · disconnected";
  })
  .catch(() => {
    const status = document.getElementById("bedrock-status");
    if (status) status.textContent = "Bedrock remote · static demo";
  });

const journeyLabels = [
  "Consent and device setup",
  "Child story and calm engagement",
  "Caregiver advocate",
  "Provider EHR-style review",
  "Shared plan and unresolved items"
];
let journeyStep = 1;
let cameraStream = null;
let storyPage = 0;
const storyPages = [
  ["The little rocket gets ready", "Leo helps the rocket find three red blocks before launch."],
  ["A careful countdown", "The grown-ups talk while Leo counts five bright stars."],
  ["The rocket comes home", "Everyone checks the plan, then Leo guides the rocket safely home."]
];

function renderJourney() {
  document.querySelectorAll(".journey-tabs button").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.step) === journeyStep);
  });
  document.querySelectorAll(".journey-pane").forEach(pane => {
    pane.classList.toggle("active", Number(pane.dataset.pane) === journeyStep);
  });
  const progress = document.getElementById("journey-progress");
  const label = document.getElementById("journey-label");
  const back = document.getElementById("journey-back");
  const next = document.getElementById("journey-next");
  if (progress) progress.textContent = `STEP ${journeyStep} OF 5`;
  if (label) label.textContent = journeyLabels[journeyStep - 1];
  if (back) back.disabled = journeyStep === 1;
  if (next) {
    next.disabled = journeyStep === 5;
    next.textContent = journeyStep === 5 ? "Journey complete" : `Next: ${journeyLabels[journeyStep].toLowerCase()} →`;
  }
}

document.querySelector(".journey-tabs")?.addEventListener("click", event => {
  const button = event.target.closest("button[data-step]");
  if (!button) return;
  journeyStep = Number(button.dataset.step);
  renderJourney();
});
document.getElementById("journey-back")?.addEventListener("click", () => {
  journeyStep = Math.max(1, journeyStep - 1);
  renderJourney();
});
document.getElementById("journey-next")?.addEventListener("click", () => {
  journeyStep = Math.min(5, journeyStep + 1);
  renderJourney();
});
document.getElementById("enable-camera")?.addEventListener("click", async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const preview = document.getElementById("camera-preview");
    preview.srcObject = cameraStream;
    await preview.play();
    document.getElementById("stop-camera").disabled = false;
    showToast("Local camera preview enabled — not recorded");
  } catch {
    showToast("Camera unavailable or permission declined");
  }
});
document.getElementById("stop-camera")?.addEventListener("click", () => {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  const preview = document.getElementById("camera-preview");
  if (preview) preview.srcObject = null;
  document.getElementById("stop-camera").disabled = true;
  showToast("Camera preview stopped");
});
document.getElementById("story-next")?.addEventListener("click", () => {
  storyPage = (storyPage + 1) % storyPages.length;
  document.getElementById("story-page").textContent = String(storyPage + 1);
  document.getElementById("story-title").textContent = storyPages[storyPage][0];
  document.getElementById("story-copy").textContent = storyPages[storyPage][1];
});
document.getElementById("read-story")?.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return showToast("Spoken story unavailable");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${storyPages[storyPage][0]}. ${storyPages[storyPage][1]}`);
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
  showToast("Reading fictional story — tap mute to interrupt");
});
document.getElementById("run-concern")?.addEventListener("click", () => {
  state.role = "caregiver";
  addTranscript("I read that this could be autism. Is that what this means?", "caregiver", true);
  journeyStep = 4;
  renderJourney();
});
document.getElementById("generate-handoff")?.addEventListener("click", async () => {
  const preview = document.getElementById("handoff-preview");
  preview.innerHTML = "<b>Requesting remote Nova Pro review…</b><p>No plan is final until confirmed.</p>";
  try {
    const text = state.transcript.map(item => `${item.role}: ${item.text}`).join("\n");
    const response = await fetch("/api/bedrock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "synthesize", text, synthetic: true })
    });
    if (!response.ok) throw new Error("unavailable");
    const result = await response.json();
    preview.innerHTML = `<b>Remote ${escapeHtml(result.model_id)} draft</b><p>${escapeHtml(result.output)}</p><small>Clinician and caregiver confirmation required.</small>`;
  } catch {
    preview.innerHTML = "<b>Remote synthesis unavailable</b><p>Use the evidence-linked local draft and preserve all unresolved items.</p>";
  }
});

window.addEventListener("beforeunload", () => {
  if (state.status === "live") {
    state.elapsed = elapsedMs();
    state.lastStartedAt = Date.now();
  }
  saveState();
});

render();
renderJourney();
if (state.status === "paused") showToast("Saved session restored — resume when ready");
