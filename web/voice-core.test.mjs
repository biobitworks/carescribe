import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, minimizedPublicUpdate, normalizeActor } from "./voice-core.mjs";

test("voice actor requires a temporary name and closed role", () => {
  assert.deepEqual(normalizeActor(" Maya ", "caregiver"), { name: "Maya", role: "caregiver" });
  assert.throws(() => normalizeActor("", "caregiver"), /display name/);
  assert.throws(() => normalizeActor("Maya", "admin"), /valid role/);
});

test("public voice updates never include names or transcript text", () => {
  const caregiver = minimizedPublicUpdate("caregiver");
  assert.deepEqual(Object.keys(caregiver).sort(), ["public_update", "uncertainty"]);
  assert.match(caregiver.public_update, /details remain private/);
  assert.equal(JSON.stringify(caregiver).includes("Maya"), false);
});

test("child and uncertain signals preserve unknown meaning", () => {
  assert.equal(minimizedPublicUpdate("child").uncertainty, "UNKNOWN");
  assert.equal(minimizedPublicUpdate("uncertain").uncertainty, "UNKNOWN");
});

test("canonical JSON is deterministic for custody checkpoints", () => {
  assert.equal(canonicalJson({ z: 1, a: "x" }), '{"a":"x","z":1}');
});
