import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./voice.html", import.meta.url), "utf8");
const script = readFileSync(new URL("./voice.js", import.meta.url), "utf8");

const buttonIds = [
  "connect-voice",
  "end-voice",
  "verify-actor",
  "start-round",
  "continue-round",
  "pause-round",
  "stop-round",
  "start-mic",
  "stop-mic",
  "approve-update",
  "send-typed-response",
];

test("every live-demo action is a named native button", () => {
  for (const id of buttonIds) {
    assert.match(
      html,
      new RegExp(`<button[^>]*id="${id}"[^>]*>[^<]+</button>`),
      `${id} must be a named native button`,
    );
  }
});

test("actor and consent confirmations use labeled native checkboxes", () => {
  for (const id of ["actor-confirm", "synthetic-consent", "cloud-consent"]) {
    assert.match(
      html,
      new RegExp(`<label[^>]*>[\\s\\S]*?<input[^>]*id="${id}"[^>]*type="checkbox"`),
      `${id} must be contained by a label`,
    );
  }
});

test("typed fallback is explicitly labeled and does not claim microphone capture", () => {
  assert.match(html, /<label for="typed-response">Accessible fallback response<\/label>/);
  assert.match(html, /Fallback only: no microphone audio is captured/);
  assert.match(script, /kind: "typed-response-fallback"/);
});

test("dynamic voice state is announced and role receipt denies identity proof", () => {
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="Operator-selected speaker"/);
  assert.match(script, /not identity proof/);
  assert.match(script, /identity_proof:\s*false/);
  assert.match(script, /MIC LIVE · \$\{role\.toUpperCase\(\)\} ROLE SELECTED/);
});

test("shared-room links and controls preserve the requested room", () => {
  assert.match(script, /new URLSearchParams\(window\.location\.search\)\.get\("room"\)/);
  assert.match(script, /url\.searchParams\.set\("room", pageRoom\)/);
  assert.match(script, /els\["room-code"\]\.value = pageRoom/);
});
