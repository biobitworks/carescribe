"use strict";

const STORAGE_KEY = "carescribe-live-session-v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isStaticPagesHost = window.location.hostname.endsWith(".github.io");

const sampleLines = [
  { role: "provider", text: "Tell me what led you to schedule the evaluation." },
  { role: "caregiver", text: "Leo says “mama,” “no,” and maybe “go.” His daycare teacher thinks he should be talking more." },
  { role: "child", text: "[Scream / loud vocalization]" },
  { role: "provider", text: "Today I am looking at how Leo communicates, what he understands, and how he plays." },
  { role: "caregiver", text: "I am worried I will forget what you tell me." },
  { role: "provider", text: "We did not observe everything needed today, so a second visit will continue the evaluation." },
  { role: "caregiver", text: "Is the next visit therapy, or more evaluating? What should I notice at home?" },
  { role: "provider", text: "Notice two or three examples of how Leo asks for help, asks for more, or wants something to stop." },
  { role: "child", text: "[Nonverbal reach toward bubbles]" }
];

const defaultCaregiverActions = `
  <div class="handoff-item"><small>TODAY</small><strong>Leo’s evaluation started and is not complete.</strong><span>No therapy recommendation or diagnosis was made today.</span></div>
  <div class="handoff-item"><small>NEXT</small><strong>Capture 2–3 examples of HELP, MORE, or STOP.</strong><span>Words, gestures, sounds, and actions all count.</span></div>
  <div class="handoff-item"><small>WHO</small><strong>Maya observes; Julie reviews.</strong><span>Shared responsibility remains visible.</span></div>
  <div class="handoff-item"><small>WHEN</small><strong>Before and at the second evaluation visit.</strong><span>Confirm the appointment date with the clinic.</span></div>`;

const defaultProviderEvidence = `
  <div class="handoff-item"><small>CAREGIVER REPORT</small><strong>Leo uses “mama,” “no,” and possibly “go.”</strong><span>Source: caregiver statement · family approval pending</span></div>
  <div class="handoff-item"><small>DIRECT OBSERVATION</small><strong>Sounds, gestures, and actions were observed; meaning remains uncertain.</strong><span>Source: synthetic transcript · provider review pending</span></div>
  <div class="handoff-item"><small>EVIDENCE STILL NEEDED</small><strong>Understanding, play, speech, sounds, and gestures.</strong><span>First evaluation visit was incomplete.</span></div>
  <div class="handoff-item"><small>FOLLOW-UP NEEDED</small><strong>Second visit continues evaluation; confirm owner, timing, and caregiver understanding.</strong><span>No diagnosis inferred.</span></div>`;

const defaultProviderFeed = `
  <article class="update approved"><small>CAREGIVER APPROVED · 09:41</small><b>Needs clear instructions before the second evaluation visit</b><span>Linked to caregiver statement</span></article>
  <article class="update"><small>NEW · REVIEW NEEDED</small><b>Child used sounds, gestures, and actions</b><span>Meaning remains unknown</span></article>`;

const state = loadState();
let recognition = null;
let timerHandle = null;
let simulationHandle = null;
let toastHandle = null;
let advocateMuted = false;
let custody = window.CareScribeCustody
  ? new window.CareScribeCustody.CustodyLedger()
  : null;
let sessionGeneration = 0;
let previousFcoId = null;
let correctionPredecessorId = null;
let custodyChain = Promise.resolve();
let localGateChain = Promise.resolve();
let pendingPublicUpdates = [];
let roomPollHandle = null;
const seenRoomEvents = new Set();

const els = Object.fromEntries([
  "session-title", "session-date", "timer", "status-chip", "start-session", "pause-session",
  "end-session", "delete-session", "audio-state", "audio-label", "role-tabs", "transcript-list",
  "transcript-empty", "manual-form", "manual-text", "observations-list", "observations-empty",
  "observation-count", "questions-list", "questions-empty", "question-count", "consent-dialog",
  "consent-check", "privacy-check", "confirm-consent", "end-dialog", "confirm-end",
  "delete-dialog", "confirm-delete", "info-dialog", "open-info", "toast", "room-dialog",
  "provider-name", "caregiver-name", "child-name", "child-mode", "confirm-room",
  "room-code", "room-code-input", "room-link", "copy-room-link", "room-sync-state",
  "voice-role-label", "platform-voice-label"
].map(id => [id, document.getElementById(id)]));

function requestedRoomCode() {
  return window.CareScribeCustody.normalizeRoomCode(
    new URLSearchParams(window.location.search).get("room"),
  );
}

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
    custodyCheckpoints: [],
    mmrRoot: null,
    startedOn: Date.now(),
    simulationIndex: 0,
    mode: null,
    participantNames: { provider: "Julie, SLP", caregiver: "Maya", child: "Leo" },
    childMode: "mixed",
    roomCode: requestedRoomCode(),
    platformVoiceLabel: "",
    handoff: null,
    handoffReview: { version: null, caregiver: false, provider: false, finalized: false }
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

function resetDynamicViews() {
  const caregiverList = document.getElementById("caregiver-action-list");
  const providerList = document.getElementById("provider-evidence-list");
  const providerFeed = document.getElementById("provider-live-feed");
  const eventStream = document.getElementById("fco-event-stream");
  const graph = document.getElementById("fcg-graph");
  const handoffPreview = document.getElementById("handoff-preview");
  const childExpression = document.getElementById("child-expression");
  const model = document.getElementById("local-model-name");
  const boundary = document.getElementById("local-boundary-state");
  const publicPreview = document.getElementById("public-update-preview");

  if (caregiverList) caregiverList.innerHTML = defaultCaregiverActions;
  if (providerList) providerList.innerHTML = defaultProviderEvidence;
  if (providerFeed) providerFeed.innerHTML = defaultProviderFeed;
  if (eventStream) {
    eventStream.innerHTML = "<article><time>Ready</time><i></i><span><b>Local custody initialized</b><small>Append-only FCO events appear here.</small></span><code>FCO</code></article>";
  }
  if (graph) {
    graph.innerHTML = "<article><small>LOCAL GRAPH</small><b>Waiting for events</b><span>Relationships remain evidence-linked.</span></article>";
  }
  if (handoffPreview) {
    handoffPreview.innerHTML = "<b>Waiting for clinician-reviewed handoff</b><p>No plan is finalized until caregiver and provider confirm it.</p>";
  }
  if (childExpression) childExpression.textContent = "[Reaches toward bubbles]";
  if (model) model.textContent = "Waiting for event";
  if (boundary) boundary.textContent = "Not shared to room without approval";
  if (publicPreview) publicPreview.textContent = "Nothing enters the shared room without approval.";

  journeyStep = 1;
  storyPage = 0;
  document.getElementById("story-page").textContent = "1";
  document.getElementById("story-title").textContent = storyPages[0][0];
  document.getElementById("story-copy").textContent = storyPages[0][1];
  renderJourney();
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
  renderRoom();
  renderRoomConnection();
  renderVoiceRoleHint();
  renderTranscript();
  renderObservations();
  renderQuestions();
  renderHandoff();
  updateAudioState();
  renderOperationalViews();
}

function renderHandoff() {
  const handoff = state.handoff;
  if (handoff) {
    const caregiverList = document.getElementById("caregiver-action-list");
    const providerList = document.getElementById("provider-evidence-list");
    if (caregiverList) caregiverList.innerHTML = handoff.caregiverItems.map(item => `
      <div class="handoff-item"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`).join("");
    if (providerList) providerList.innerHTML = handoff.providerItems.map(item => `
      <div class="handoff-item"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>`).join("");
  }
  const review = state.handoffReview || (state.handoffReview = { version: null, caregiver: false, provider: false, finalized: false });
  if (!handoff || review.version !== handoff.version) {
    state.handoffReview = { version: handoff?.version || null, caregiver: false, provider: false, finalized: false };
  }
  const currentReview = state.handoffReview;
  const caregiverButton = document.getElementById("approve-caregiver-card");
  const providerButton = document.getElementById("approve-provider-brief");
  const finalizeButton = document.getElementById("finalize-handoff");
  const status = document.getElementById("handoff-status");
  const message = document.getElementById("handoff-review-message");
  if (caregiverButton) {
    caregiverButton.textContent = currentReview.caregiver ? "✓ Caregiver card approved" : "Approve caregiver card";
    caregiverButton.classList.toggle("approved", currentReview.caregiver);
    caregiverButton.setAttribute("aria-pressed", String(currentReview.caregiver));
  }
  if (providerButton) {
    providerButton.textContent = currentReview.provider ? "✓ Provider reviewed" : "Mark provider reviewed";
    providerButton.classList.toggle("approved", currentReview.provider);
    providerButton.setAttribute("aria-pressed", String(currentReview.provider));
  }
  const ready = currentReview.caregiver && currentReview.provider;
  if (finalizeButton) {
    finalizeButton.disabled = !ready || currentReview.finalized;
    finalizeButton.textContent = currentReview.finalized ? "✓ Reviewed handoff finalized" : "Finalize reviewed handoff";
  }
  if (status) status.textContent = currentReview.finalized ? "FINALIZED · HUMAN REVIEWED" : ready ? "READY TO FINALIZE" : "DRAFT · REVIEW REQUIRED";
  if (message) message.textContent = currentReview.finalized
    ? "The exact handoff was confirmed by caregiver and provider."
    : ready ? "Both reviewers confirmed the draft." : "Caregiver and provider approvals are both required.";
}

function populateHandoffFromSession() {
  const unresolved = state.questions.find(item => !item.asked)?.text
    || "Confirm when the second evaluation visit will occur.";
  const caregiverEvidence = state.transcript.find(item => item.role === "caregiver")?.text || "No caregiver statement captured yet.";
  const childEvidence = state.transcript.find(item => item.role === "child")?.text || "No direct child communication captured yet.";
  state.handoff = {
    version: crypto.randomUUID(),
    caregiverItems: [
      { label: "TODAY", title: "Leo’s evaluation started and is not complete.", detail: "No therapy recommendation or diagnosis was made today." },
      { label: "NEXT", title: "Capture 2–3 examples of HELP, MORE, or STOP.", detail: "Words, gestures, sounds, and actions all count; do not interpret them." },
      { label: "WHO", title: `${state.participantNames.caregiver} observes; ${state.participantNames.provider} reviews.`, detail: "The clinician completes the evaluation and explains the result." },
      { label: "WHEN", title: "Before and at the second evaluation visit.", detail: "Confirm the appointment date with the clinic." }
    ],
    providerItems: [
      { label: "CAREGIVER REPORT", title: caregiverEvidence, detail: "Source: caregiver transcript · attribution preserved" },
      { label: "DIRECT COMMUNICATION", title: childEvidence, detail: "Source: child transcript or labeled synthetic event" },
      { label: "EVIDENCE STILL NEEDED", title: "Complete observations of understanding, play, speech, sounds, and gestures.", detail: "The first visit was incomplete; no diagnostic conclusion is supported." },
      { label: "FOLLOW-UP NEEDED", title: unresolved, detail: "Second visit continues evaluation; confirm owner, timing, and caregiver understanding." }
    ]
  };
  state.handoffReview = { version: state.handoff.version, caregiver: false, provider: false, finalized: false };
  saveState();
  renderHandoff();
}

function renderRoom() {
  const roster = window.CareScribeCustody.createRoomRoster(state.participantNames, state.role);
  roster.forEach(person => {
    const actor = document.querySelector(`[data-actor-role="${person.role}"]`);
    if (actor) {
      actor.classList.toggle("speaking", person.active && state.status === "live");
      actor.querySelector("h3").textContent = person.name;
    }
    const roleButton = document.querySelector(`#role-tabs [data-role="${person.role}"]`);
    if (roleButton) roleButton.lastChild.textContent = ` ${person.name}`;
  });
  const labels = {
    verbal: "Mostly verbal · other signals still welcome",
    nonverbal: "Nonverbal communication · no speech expected",
    mixed: "Verbal and nonverbal communication",
  };
  const communication = document.getElementById("child-communication");
  if (communication) communication.textContent = labels[state.childMode] || labels.mixed;
}

function roomJoinUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", state.roomCode);
  return url.toString();
}

function renderRoomConnection() {
  if (els["room-code"]) els["room-code"].textContent = state.roomCode;
  if (els["room-code-input"] && document.activeElement !== els["room-code-input"]) {
    els["room-code-input"].value = state.roomCode;
  }
  if (els["room-link"]) els["room-link"].textContent = roomJoinUrl();
}

function renderVoiceRoleHint() {
  const hint = window.CareScribeCustody.createVoiceRoleHint({
    selectedRole: state.role,
    platformLabel: state.platformVoiceLabel,
  });
  if (els["voice-role-label"]) els["voice-role-label"].textContent = hint.label;
  if (els["platform-voice-label"] && document.activeElement !== els["platform-voice-label"]) {
    els["platform-voice-label"].value = state.platformVoiceLabel;
  }
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
  const checkpointTrigger = document.getElementById("checkpoint-trigger");
  const checkpointCount = document.getElementById("checkpoint-count");
  const custodyCount = custody?.fcos.length || state.custodyEvents.length;
  const custodyRoot = custody?.root || state.mmrRoot;
  const checkpoints = custody?.checkpoints || state.custodyCheckpoints || [];
  const latestCheckpoint = checkpoints.at(-1);
  if (count) count.textContent = `${custodyCount} EVENTS`;
  if (root) root.textContent = custodyRoot
    ? `${custodyRoot.slice(0, 20)}… computed from canonical persisted bytes`
    : "No canonical events appended yet.";
  if (checkpointTrigger) checkpointTrigger.textContent = latestCheckpoint
    ? `${latestCheckpoint.triggerType} · ${latestCheckpoint.triggerId.slice(0, 12)}…`
    : "Waiting for actor or model event";
  if (checkpointCount) checkpointCount.textContent = `${checkpoints.length} roots`;
}

function persistCustodyLedger() {
  if (!custody) return;
  state.custodyEvents = custody.fcos.map(event => ({ ...event }));
  state.custodyEdges = custody.edges.map(edge => ({ ...edge }));
  state.custodyCheckpoints = custody.checkpoints.map(checkpoint => ({ ...checkpoint }));
  state.mmrRoot = custody.root;
  saveState();
  renderOperationalViews();
}

function initializeActorCustody() {
  if (!custody) return;
  const roles = ["provider", "caregiver", "child", "uncertain"];
  custodyChain = custodyChain.then(async () => {
    if (custody.fcos.some(event => event.fcoType === "actor")) return;
    for (const role of roles) {
      await custody.appendActorFCO({
        timestamp: new Date().toISOString(),
        speaker: role,
        role,
        statement: `${role} joined with a session-scoped identity.`,
        observation: "ACTOR_JOINED",
        confidence: role === "uncertain" ? "UNCERTAIN" : "NEEDS_REVIEW",
        source: "room setup",
        clinicalRelevance: "UNKNOWN",
        status: "LOCAL_ONLY",
      });
    }
    persistCustodyLedger();
  });
}

function checkpointModelInvocation({ provider, model, prompt, outcome, responseSummary, errorCode }) {
  if (!custody) return;
  custodyChain = custodyChain.then(async () => {
    await custody.appendModelInvocationFCO({
      timestamp: new Date().toISOString(),
      provider,
      model,
      prompt,
      outcome,
      responseSummary,
      errorCode,
    });
    persistCustodyLedger();
  });
}

function renderTranscript() {
  els["transcript-empty"].classList.toggle("hidden", state.transcript.length > 0);
  els["transcript-list"].querySelectorAll(".transcript-entry").forEach(node => node.remove());
  state.transcript.forEach(item => {
    const article = document.createElement("article");
    article.className = "transcript-entry";
    article.innerHTML = `
      <div class="speaker-label ${item.role}">${escapeHtml(state.participantNames[item.role] || item.role)}</div>
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
  if (state.handoff) {
    state.handoff = null;
    state.handoffReview = { version: null, caregiver: false, provider: false, finalized: false };
  }
  const item = { id: crypto.randomUUID(), role, text: clean, timestamp: Date.now(), simulated };
  state.transcript.push(item);
  deriveInsight(item);
  appendCustodyEvent(item, sessionGeneration);
  queueLocalGate(item, sessionGeneration);
  saveState();
  render();
}

async function appendCustodyEvent(item, generation) {
  custodyChain = custodyChain.then(() => {
    if (generation !== sessionGeneration) return undefined;
    return appendCustodyEventNow(item);
  });
  return custodyChain;
}

async function appendCustodyEventNow(item) {
  if (!custody) return;
  const status = item.role === "provider" ? "NEEDS_REVIEW" : "UNCERTAIN";
  const fields = {
    timestamp: new Date(item.timestamp).toISOString(),
    speaker: state.participantNames[item.role] || item.role,
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
    const edgeKind = /\?|autism/i.test(item.text) ? "QUESTION" : "FOLLOW_UP";
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

function queueLocalGate(item, generation) {
  if (isStaticPagesHost) {
    applyStaticLocalGate(item, generation);
    return;
  }
  localGateChain = localGateChain
    .then(() => generation === sessionGeneration
      ? requestLocalGate(item, generation)
      : undefined)
    .catch(() => {
      const boundary = document.getElementById("local-boundary-state");
      if (boundary) boundary.textContent = "Local deterministic privacy fallback active";
    });
}

function applyStaticLocalGate(item, generation) {
  if (generation !== sessionGeneration) return;
  const lower = item.text.toLowerCase();
  const publicUpdate = lower.includes("scream") || lower.includes("loud vocalization")
    ? "Child emitted a loud vocalization; meaning remains unknown."
    : lower.includes("nonverbal") || lower.includes("reach")
      ? "Child used nonverbal communication; meaning remains unknown."
      : `A ${item.role} event is available for review.`;
  pendingPublicUpdates.push({
    role: item.role,
    publicUpdate,
    uncertainty: "UNKNOWN",
  });
  const model = document.getElementById("local-model-name");
  const boundary = document.getElementById("local-boundary-state");
  const preview = document.getElementById("public-update-preview");
  if (model) model.textContent = "deterministic-static-fallback";
  if (boundary) boundary.textContent = "STATIC_ONLY · no model or room request";
  if (preview) preview.textContent = publicUpdate;
}

async function requestLocalGate(item, generation) {
  const modelPrompt = `${item.role}:${item.text}`;
  const response = await fetch("/api/local-gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: item.role,
      speaker: state.participantNames[item.role] || item.role,
      text: item.text,
      approved: false,
      synthetic: true,
    }),
  });
  if (!response.ok) {
    if (generation !== sessionGeneration) return;
    checkpointModelInvocation({
      provider: "local",
      model: "LiquidAI LFM2.5 or deterministic fallback",
      prompt: modelPrompt,
      outcome: "failure",
      errorCode: `HTTP_${response.status}`,
    });
    throw new Error("local gate unavailable");
  }
  const result = await response.json();
  if (generation !== sessionGeneration) return;
  checkpointModelInvocation({
    provider: result.inference_location || "local",
    model: result.model,
    prompt: modelPrompt,
    outcome: "success",
    responseSummary: "Local privacy gate produced a bounded disclosure decision.",
  });
  pendingPublicUpdates.push({
    role: item.role,
    publicUpdate: result.public_update,
    uncertainty: result.uncertainty || "UNKNOWN",
  });
  const model = document.getElementById("local-model-name");
  const boundary = document.getElementById("local-boundary-state");
  const preview = document.getElementById("public-update-preview");
  if (model) model.textContent = result.model;
  if (boundary) boundary.textContent = `${result.disclosure} · exact event stays on the local Python host`;
  if (preview) preview.textContent = result.public_update;
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
}

async function sharePendingUpdate() {
  const pending = pendingPublicUpdates[0];
  if (!pending) return showToast("No minimized update is waiting");
  if (isStaticPagesHost) {
    showToast("Static presentation mode — room sharing requires the local server");
    return;
  }
  const publication = window.CareScribeCustody.createRoomPublication({
    room: state.roomCode,
    role: pending.role,
    publicUpdate: pending.publicUpdate,
    uncertainty: pending.uncertainty,
    approved: true,
  });
  const feed = document.getElementById("provider-live-feed");
  try {
    const response = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publication),
    });
    if (!response.ok) throw new Error("unavailable");
    pendingPublicUpdates.shift();
    const preview = document.getElementById("public-update-preview");
    if (preview) {
      preview.textContent = pendingPublicUpdates[0]?.publicUpdate
        || "Nothing enters the shared room without approval.";
    }
    if (feed) {
      feed.insertAdjacentHTML("afterbegin", `<article class="update approved"><small>CAREGIVER APPROVED · SHARED ROOM</small><b>${escapeHtml(pending.publicUpdate)}</b><span>Minimized room event · names and exact transcript excluded from this publication</span></article>`);
    }
    requestRemoteAtomization(pending, sessionGeneration);
    showToast("Caregiver-approved minimized update shared to the room");
  } catch {
    showToast("Room unavailable — update remains in the local approval queue");
  }
}

async function requestRemoteAtomization(pending, generation) {
  const prompt = pending.publicUpdate;
  try {
    const response = await fetch("/api/bedrock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "atomize", text: prompt, synthetic: true }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const result = await response.json();
    if (generation !== sessionGeneration) return;
    checkpointModelInvocation({
      provider: "Amazon Bedrock",
      model: result.model_id,
      prompt,
      outcome: "success",
      responseSummary: "Approved minimized update received a remote atomization review.",
    });
    const feed = document.getElementById("provider-live-feed");
    if (feed) {
      feed.insertAdjacentHTML("afterbegin", `<article class="update"><small>REMOTE ${escapeHtml(result.model_id)} · REVIEW NEEDED</small><b>Approved minimized event atomized</b><span>Model output remains untrusted until provider review</span></article>`);
    }
  } catch (error) {
    if (generation !== sessionGeneration) return;
    checkpointModelInvocation({
      provider: "Amazon Bedrock",
      model: "amazon.nova-micro-v1:0",
      prompt,
      outcome: "failure",
      errorCode: String(error.message || "BEDROCK_UNAVAILABLE"),
    });
  }
}

function roomEventKey(event) {
  return String(event.id || event.event_id || `${event.role}|${event.public_update}|${event.timestamp || ""}`);
}

function renderPublicRoomEvents(events) {
  const feed = document.getElementById("provider-live-feed");
  if (!feed || !Array.isArray(events)) return;
  events.forEach(event => {
    if (!event || typeof event.public_update !== "string") return;
    const key = roomEventKey(event);
    if (seenRoomEvents.has(key)) return;
    seenRoomEvents.add(key);
    feed.insertAdjacentHTML("afterbegin", `<article class="update approved"><small>ROOM UPDATE · ${escapeHtml(event.role || "uncertain")}</small><b>${escapeHtml(event.public_update)}</b><span>${escapeHtml(event.uncertainty || "UNKNOWN")} · public minimized event</span></article>`);
  });
}

async function pollRoom() {
  if (isStaticPagesHost) {
    els["room-sync-state"].textContent = "Static presentation · no room backend";
    els["room-sync-state"].className = "room-sync-state";
    return;
  }
  try {
    const response = await fetch(`/api/room?room=${encodeURIComponent(state.roomCode)}`, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("room unavailable");
    const result = await response.json();
    renderPublicRoomEvents(result.events);
    els["room-sync-state"].textContent = `Connected · ${result.events?.length || 0} public updates`;
    els["room-sync-state"].className = "room-sync-state connected";
  } catch {
    els["room-sync-state"].textContent = "Room server unavailable · local data safe";
    els["room-sync-state"].className = "room-sync-state error";
  }
}

function startRoomPolling() {
  if (roomPollHandle) clearInterval(roomPollHandle);
  pollRoom();
  roomPollHandle = window.setInterval(pollRoom, 2000);
}

function deriveInsight(item) {
  // Provider prompts are context, not evidence about the child or caregiver.
  if (item.role === "provider") return;
  const lower = item.text.toLowerCase();
  let insight = null;
  let question = null;
  if (/next visit|more evaluating|therapy/.test(lower)) {
    insight = { summary: "Caregiver needs clarification that the second visit continues the evaluation", confidence: 100 };
    question = "When is the second evaluation visit, and what should the caregiver bring?";
  } else if (/help|more|stop/.test(lower)) {
    insight = { summary: "Home observation prompt covers HELP, MORE, and STOP", confidence: 92 };
    question = "Can the caregiver bring two or three examples without interpreting their meaning?";
  } else if (/mama|daycare|talking|words|communication|gesture/.test(lower)) {
    insight = { summary: "Caregiver reported current words and concern about communication", confidence: 88 };
    question = "What communication is seen across home and daycare settings?";
  } else if (/scream|vocalization|nonverbal|reach/.test(lower)) {
    insight = { summary: "A child signal was captured without assigning meaning", confidence: 70 };
    question = "What happened immediately before and after the signal?";
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
    els["room-dialog"].showModal();
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
    showToast("Microphone active — transcript is stored here; recognition may use the browser vendor");
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
  stopCameraPreview();
  stopTimer();
  sessionGeneration += 1;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, blankState());
  custody = window.CareScribeCustody
    ? new window.CareScribeCustody.CustodyLedger()
    : null;
  previousFcoId = null;
  correctionPredecessorId = null;
  custodyChain = Promise.resolve();
  localGateChain = Promise.resolve();
  pendingPublicUpdates = [];
  seenRoomEvents.clear();
  els["consent-check"].checked = false;
  els["privacy-check"].checked = false;
  updateConsentButton();
  resetDynamicViews();
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

els["confirm-room"].addEventListener("click", () => {
  state.participantNames = {
    provider: els["provider-name"].value.trim() || "Provider",
    caregiver: els["caregiver-name"].value.trim() || "Caregiver",
    child: els["child-name"].value.trim() || "Child",
  };
  state.childMode = els["child-mode"].value;
  state.roomCode = window.CareScribeCustody.normalizeRoomCode(els["room-code-input"].value);
  saveState();
  initializeActorCustody();
  render();
  startRoomPolling();
  window.setTimeout(() => els["consent-dialog"].showModal(), 0);
});

els["role-tabs"].addEventListener("click", event => {
  const button = event.target.closest("button[data-role]");
  if (!button) return;
  state.role = button.dataset.role;
  saveState();
  render();
});

els["platform-voice-label"]?.addEventListener("input", event => {
  state.platformVoiceLabel = event.target.value.trim();
  saveState();
  renderVoiceRoleHint();
});

els["copy-room-link"]?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(roomJoinUrl());
    showToast("Room join link copied");
  } catch {
    showToast("Copy unavailable — select the displayed join link");
  }
});

function addChildSignal(kind) {
  const signal = window.CareScribeCustody.describeChildSignal(kind, state.participantNames.child);
  state.role = "child";
  const expression = document.getElementById("child-expression");
  if (expression) expression.textContent = signal.statement;
  addTranscript(signal.statement, "child", true);
  showToast(`${signal.speaker}: event captured without interpreting its cause`);
}

document.getElementById("child-nonverbal")?.addEventListener("click", () => addChildSignal("nonverbal"));
document.getElementById("child-scream")?.addEventListener("click", () => addChildSignal("scream"));
document.getElementById("child-random")?.addEventListener("click", () => {
  addChildSignal(Math.random() < 0.5 ? "nonverbal" : "scream");
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
    if (!next && !pendingPublicUpdates.length) return showToast("No intervention or update is waiting");
    if (next && !advocateMuted && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(`Before we move on, the caregiver still has an unresolved question. ${next.text}`);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
    if (next) next.asked = true;
    saveState();
    render();
    sharePendingUpdate();
    showToast("Caregiver approved a brief advocate intervention");
  }
});

function renderStaticModelStatus() {
  const status = document.getElementById("bedrock-status");
  if (status) status.textContent = "Bedrock remote · static demo";
  const list = document.getElementById("model-runtime-list");
  if (list) {
    list.innerHTML = `<article>
      <small>github-pages</small>
      <b>Recorded/static fallback</b>
      <span>No model process or room backend runs on this static host</span>
      <i class="not-run">static-only</i>
    </article>`;
  }
}

function loadModelHealth() {
  if (isStaticPagesHost) {
    renderStaticModelStatus();
    return;
  }
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
      const list = document.getElementById("model-runtime-list");
      if (list && Array.isArray(health.models)) {
        list.innerHTML = health.models.map(model => `<article>
          <small>${escapeHtml(model.location)}</small>
          <b>${escapeHtml(model.id)}</b>
          <span>${escapeHtml(model.purpose)}</span>
          <i class="${escapeHtml(model.status)}">${escapeHtml(model.status)}</i>
        </article>`).join("");
      }
    })
    .catch(renderStaticModelStatus);
}

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
function stopCameraPreview(showMessage = false) {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  const preview = document.getElementById("camera-preview");
  if (preview) preview.srcObject = null;
  const stopButton = document.getElementById("stop-camera");
  if (stopButton) stopButton.disabled = true;
  if (showMessage) showToast("Camera preview stopped");
}
document.getElementById("stop-camera")?.addEventListener("click", () => {
  stopCameraPreview(true);
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
  addTranscript("Is the next visit therapy, or more evaluating? What should I notice at home?", "caregiver", true);
  journeyStep = 4;
  renderJourney();
});
document.getElementById("generate-handoff")?.addEventListener("click", async () => {
  const preview = document.getElementById("handoff-preview");
  populateHandoffFromSession();
  document.querySelector(".handoff-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (isStaticPagesHost) {
    preview.innerHTML = "<b>Static presentation mode</b><p>Using the evidence-linked local draft. No remote model was invoked.</p>";
    return;
  }
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
    checkpointModelInvocation({
      provider: "Amazon Bedrock",
      model: result.model_id,
      prompt: text,
      outcome: "success",
      responseSummary: "Remote model returned a bounded synthetic handoff draft.",
    });
    preview.innerHTML = `<b>Remote ${escapeHtml(result.model_id)} draft</b><p>${escapeHtml(result.output)}</p><small>Clinician and caregiver confirmation required.</small>`;
  } catch {
    checkpointModelInvocation({
      provider: "Amazon Bedrock",
      model: "amazon.nova-pro-v1:0",
      prompt: state.transcript.map(item => `${item.role}:${item.text}`).join("\n"),
      outcome: "failure",
      errorCode: "BEDROCK_UNAVAILABLE",
    });
    preview.innerHTML = "<b>Remote synthesis unavailable</b><p>Use the evidence-linked local draft and preserve all unresolved items.</p>";
  }
});

document.getElementById("approve-caregiver-card")?.addEventListener("click", () => {
  state.handoffReview.caregiver = !state.handoffReview.caregiver;
  state.handoffReview.finalized = false;
  saveState();
  renderHandoff();
  showToast(state.handoffReview.caregiver ? "Caregiver approved the exact action card" : "Caregiver approval removed");
});

document.getElementById("approve-provider-brief")?.addEventListener("click", () => {
  state.handoffReview.provider = !state.handoffReview.provider;
  state.handoffReview.finalized = false;
  saveState();
  renderHandoff();
  showToast(state.handoffReview.provider ? "Provider review recorded" : "Provider review removed");
});

document.getElementById("finalize-handoff")?.addEventListener("click", () => {
  if (!state.handoffReview.caregiver || !state.handoffReview.provider) return;
  state.handoffReview.finalized = true;
  saveState();
  renderHandoff();
  showToast("Reviewed handoff finalized on this device");
});

window.addEventListener("beforeunload", () => {
  if (state.status === "live") {
    state.elapsed = elapsedMs();
    state.lastStartedAt = Date.now();
  }
  saveState();
  if (roomPollHandle) clearInterval(roomPollHandle);
});

render();
renderJourney();
loadModelHealth();
custodyChain = custodyChain.then(async () => {
  if (!custody || !Array.isArray(state.custodyEvents) || !state.custodyEvents.length) return;
  for (const event of state.custodyEvents) await custody.appendFCO(event);
  for (const edge of state.custodyEdges || []) custody.appendEdge(edge);
  previousFcoId = custody.fcos.at(-1)?.id || null;
  persistCustodyLedger();
}).catch(() => {
  showToast("Saved custody data failed integrity replay; starting a new local ledger");
});
startRoomPolling();
if (state.status === "paused") showToast("Saved session restored — resume when ready");
