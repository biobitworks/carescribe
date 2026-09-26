"use strict";

const params = new URLSearchParams(window.location.search);
const roomCode = (params.get("room") || "JUDGES").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || "JUDGES";
const role = document.body.dataset.focus || "projector";
const roomInput = document.getElementById("room-input");
const roomLabel = document.getElementById("room-label");
const workspaceLink = document.getElementById("workspace-link");
const runtime = document.getElementById("runtime-state");
const modelList = document.getElementById("model-list");
const roomFeed = document.getElementById("room-feed");
const isStaticPagesHost = window.location.hostname.endsWith(".github.io");

if (roomInput) roomInput.value = roomCode;
if (roomLabel) roomLabel.textContent = roomCode;
if (workspaceLink) workspaceLink.href = `index.html?room=${encodeURIComponent(roomCode)}`;

document.querySelectorAll("nav a[data-page]").forEach(link => {
  const href = new URL(link.getAttribute("href"), window.location.href);
  href.searchParams.set("room", roomCode);
  link.href = href.toString();
  if (link.dataset.page === role) link.setAttribute("aria-current", "page");
});

document.getElementById("join-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const next = roomInput.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || "JUDGES";
  const url = new URL(window.location.href);
  url.searchParams.set("room", next);
  window.location.assign(url);
});

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = String(value);
  return node.innerHTML;
}

function renderModels(models) {
  if (!modelList) return;
  modelList.innerHTML = models.map(model => `<article class="model-card">
    <small>${escapeHtml(model.location)}</small>
    <b>${escapeHtml(model.id)}</b>
    <span>${escapeHtml(model.purpose)}</span>
    <i class="proof ${escapeHtml(model.status)}">${escapeHtml(model.status)}</i>
  </article>`).join("");
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    const health = await response.json();
    runtime.className = "runtime-state live";
    runtime.innerHTML = `<strong>Local server connected</strong><span>Real health response · ${escapeHtml(health.models.length)} bounded routes</span>`;
    renderModels(health.models);
  } catch {
    runtime.className = "runtime-state static";
    runtime.innerHTML = "<strong>Static presentation mode</strong><span>No model process or synchronized room runs on this host.</span>";
    renderModels([{
      location: "github-pages",
      id: "Recorded/static fallback",
      purpose: "Use the local Python server for live model and room proof",
      status: "static-only",
    }]);
  }
}

async function pollRoom() {
  if (!roomFeed) return;
  try {
    const response = await fetch(`/api/room?room=${encodeURIComponent(roomCode)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    roomFeed.innerHTML = data.events.length
      ? data.events.map(event => `<article><small>${escapeHtml(event.role)} · REVIEWED ROOM EVENT</small><b>${escapeHtml(event.public_update)}</b><p>Uncertainty: ${escapeHtml(event.uncertainty)}</p></article>`).join("")
      : '<p class="empty">Connected. No caregiver-approved public updates yet.</p>';
  } catch {
    roomFeed.innerHTML = '<p class="empty">Static mode: synchronized room events require the local Python server.</p>';
  }
}

if (isStaticPagesHost) {
  runtime.className = "runtime-state static";
  runtime.innerHTML = "<strong>Static presentation mode</strong><span>No model process or synchronized room runs on this host.</span>";
  renderModels([{
    location: "github-pages",
    id: "Recorded/static fallback",
    purpose: "Use the local Python server for live model and room proof",
    status: "static-only",
  }]);
  if (roomFeed) {
    roomFeed.innerHTML = '<p class="empty">Static mode: synchronized room events require the local Python server.</p>';
  }
} else {
  loadHealth();
  pollRoom();
  window.setInterval(pollRoom, 2000);
}
