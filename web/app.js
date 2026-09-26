"use strict";

const STORAGE_KEY = "carescribe-live-session-v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const sampleLines = [
  { role: "provider", text: "What changes have you noticed in play or communication since the last visit?" },
  { role: "caregiver", text: "They have started using short phrases more often and point to show us things they find interesting." },
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
  saveState();
  render();
}

function deriveInsight(item) {
  // Provider prompts are context, not evidence about the child or caregiver.
  if (item.role === "provider") return;
  const lower = item.text.toLowerCase();
  let insight = null;
  let question = null;
  if (/phrase|words|said|communication|point/.test(lower)) {
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

window.addEventListener("beforeunload", () => {
  if (state.status === "live") {
    state.elapsed = elapsedMs();
    state.lastStartedAt = Date.now();
  }
  saveState();
});

render();
if (state.status === "paused") showToast("Saved session restored — resume when ready");
