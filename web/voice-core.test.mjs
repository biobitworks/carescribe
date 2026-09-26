import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJson,
  createCheckpointChain,
  canSendAudio,
  minimizedPublicUpdate,
  normalizeActor,
  voiceWebSocketUrl,
} from "./voice-core.mjs";

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

test("checkpoint appends serialize into one chain", async () => {
  const hash = async value => `hash(${value})`;
  const chain = createCheckpointChain(hash);

  await Promise.all([
    chain.append({ sequence: 1 }),
    chain.append({ sequence: 2 }),
  ]);

  const firstEvent = await hash('{"sequence":1}');
  const firstRoot = await hash(`GENESIS:${firstEvent}`);
  const secondEvent = await hash('{"sequence":2}');
  const secondRoot = await hash(`${firstRoot}:${secondEvent}`);
  assert.deepEqual(chain.snapshot(), { count: 2, root: secondRoot });
});

test("checkpoint reset invalidates pending appends", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const hash = async value => {
    await gate;
    return `hash(${value})`;
  };
  const chain = createCheckpointChain(hash);
  const pending = chain.append({ stale: true });

  chain.reset();
  release();
  await pending;

  assert.deepEqual(chain.snapshot(), { count: 0, root: "GENESIS" });
});

test("checkpoint reset rejects work that finishes before append is queued", async () => {
  const hash = async value => `hash(${value})`;
  const chain = createCheckpointChain(hash);
  const staleGeneration = chain.token();

  chain.reset();
  await chain.append({ stale: true }, staleGeneration);

  assert.deepEqual(chain.snapshot(), { count: 0, root: "GENESIS" });
});

test("audio backpressure fails closed above the high-water mark", () => {
  assert.equal(canSendAudio({ readyState: 1, bufferedAmount: 0 }), true);
  assert.equal(canSendAudio({ readyState: 1, bufferedAmount: 262_145 }), false);
  assert.equal(canSendAudio({ readyState: 3, bufferedAmount: 0 }), false);
});

test("voice websocket URL uses local port only for local development", () => {
  assert.equal(
    voiceWebSocketUrl({ protocol: "http:", hostname: "127.0.0.1", port: "8080", host: "127.0.0.1:8080" }),
    "ws://127.0.0.1:8081/ws?synthetic=true&consent=true",
  );
  assert.equal(
    voiceWebSocketUrl({ protocol: "https:", hostname: "demo.example", port: "", host: "demo.example" }),
    "wss://demo.example/voice/ws?synthetic=true&consent=true",
  );
});
