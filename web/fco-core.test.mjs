import assert from "node:assert/strict";
import test from "node:test";
import custody from "./fco-core.js";

const base = {
  timestamp: "2026-09-26T19:00:00Z",
  speaker: "caregiver",
  role: "caregiver",
  statement: "The recorded time was incorrect.",
  observation: "CAREGIVER_CORRECTION",
  confidence: "NEEDS_REVIEW",
  source: "local transcript",
  clinicalRelevance: "UNKNOWN",
  status: "UNCERTAIN",
};

test("canonical JSON and FCO ids are deterministic", async () => {
  assert.equal(
    custody.canonicalStringify({ z: "café", a: { b: 2, a: 1 } }),
    '{"a":{"a":1,"b":2},"z":"café"}',
  );
  const first = await custody.createFCO(base);
  const second = await custody.createFCO(Object.fromEntries(Object.entries(base).reverse()));
  assert.equal(first.id, second.id);
  assert.equal(first.hash, first.id);
  assert.equal(await custody.verifyFCO(first), true);
  assert.equal(await custody.verifyFCO({ ...first, status: "VERIFIED" }), false);
});

test("corrections append a linked successor without replacing history", async () => {
  const ledger = new custody.CustodyLedger();
  const original = await ledger.appendFCO(base);
  const correction = await ledger.correct(original.id, {
    ...base,
    timestamp: "2026-09-26T19:05:00Z",
    statement: "The corrected time remains unconfirmed.",
  });

  assert.equal(ledger.fcos.length, 2);
  assert.equal(ledger.fcos[0].id, original.id);
  assert.equal(correction.predecessorId, original.id);
  assert.deepEqual(ledger.edges.at(-1), {
    source: original.id,
    target: correction.id,
    kind: "CAREGIVER_CORRECTION",
  });
});

test("FCG vocabulary is closed and uncertainty sentinels are preserved", async () => {
  assert.throws(
    () => custody.createEdge("a", "b", "DIAGNOSIS"),
    /edge kind/,
  );
  for (const value of custody.PRESERVED_VALUES) {
    const fco = await custody.createFCO({ ...base, statement: value, observation: value });
    assert.equal(fco.statement, value);
    assert.equal(fco.observation, value);
  }
});

test("MMR demonstrator has deterministic order-sensitive peaks and root", async () => {
  const ids = await Promise.all(
    [0, 1, 2].map((i) =>
      custody.createFCO({ ...base, timestamp: `2026-09-26T19:0${i}:00Z` }).then((x) => x.id),
    ),
  );
  const mmr = new custody.MMRAccumulator();
  const roots = [];
  for (const id of ids) roots.push(await mmr.append(id));

  assert.equal(mmr.size, 3);
  assert.equal(mmr.peaks.length, 2);
  assert.equal(new Set(roots).size, 3);
  assert.equal((await custody.MMRAccumulator.from(ids)).root, mmr.root);
  assert.notEqual((await custody.MMRAccumulator.from([...ids].reverse())).root, mmr.root);
});

test("room roster names three toy people and highlights exactly one active role", () => {
  const roster = custody.createRoomRoster({
    provider: " Dr. Rivera ",
    caregiver: "Sam",
    child: "",
  }, "child");

  assert.deepEqual(roster, [
    { role: "provider", name: "Dr. Rivera", active: false },
    { role: "caregiver", name: "Sam", active: false },
    { role: "child", name: "Child", active: true },
  ]);
});

test("child vocalization preserves uncertainty without assigning clinical meaning", () => {
  assert.deepEqual(custody.describeChildSignal("scream", "Ari"), {
    speaker: "Ari",
    role: "child",
    statement: "[Scream / loud vocalization]",
    observation: "NONVERBAL_VOCALIZATION",
    confidence: "NEEDS_REVIEW",
    clinicalRelevance: "UNKNOWN",
    status: "UNCERTAIN",
  });
  assert.deepEqual(custody.describeChildSignal("nonverbal", "Ari"), {
    speaker: "Ari",
    role: "child",
    statement: "[Nonverbal communication observed]",
    observation: "NONVERBAL_COMMUNICATION",
    confidence: "NEEDS_REVIEW",
    clinicalRelevance: "UNKNOWN",
    status: "UNCERTAIN",
  });
});

test("room publication contains only approved minimized fields", () => {
  assert.deepEqual(custody.createRoomPublication({
    room: " room 4 ",
    role: "child",
    publicUpdate: "Child vocalized; meaning remains unknown.",
    uncertainty: "UNKNOWN",
    approved: true,
    speaker: "Ari",
    privateSummary: "[Scream / loud vocalization]",
  }), {
    room: "ROOM4",
    role: "child",
    public_update: "Child vocalized; meaning remains unknown.",
    uncertainty: "UNKNOWN",
    synthetic: true,
  });

  assert.throws(
    () => custody.createRoomPublication({
      room: "ROOM4", role: "child", publicUpdate: "bounded", approved: false,
    }),
    /caregiver approval/,
  );
});

test("voice-role hints distinguish selected, platform, and uncertain labels", () => {
  assert.deepEqual(custody.createVoiceRoleHint({
    selectedRole: "caregiver", platformLabel: "Voice 2",
  }), {
    role: "caregiver",
    label: "Selected: Caregiver · device hint: Voice 2",
    source: "selected",
  });
  assert.deepEqual(custody.createVoiceRoleHint({
    selectedRole: "uncertain", platformLabel: "Voice 2",
  }), {
    role: "uncertain",
    label: "Uncertain speaker · device hint: Voice 2",
    source: "platform-hint",
  });
  assert.deepEqual(custody.createVoiceRoleHint({ selectedRole: "uncertain" }), {
    role: "uncertain",
    label: "Uncertain speaker · select a toy person",
    source: "uncertain",
  });
});

test("typed actor appends checkpoint provider, caregiver, child, and uncertain nodes", async () => {
  const ledger = new custody.CustodyLedger();
  const roles = ["provider", "caregiver", "child", "uncertain"];

  for (const [index, role] of roles.entries()) {
    const { fco, checkpoint } = await ledger.appendActorFCO({
      ...base,
      timestamp: `2026-09-26T20:0${index}:00Z`,
      speaker: role,
      role,
    });
    assert.equal(fco.fcoType, "actor");
    assert.equal(checkpoint.root, ledger.root);
    assert.equal(checkpoint.leafCount, index + 1);
    assert.equal(checkpoint.triggerId, fco.id);
    assert.equal(checkpoint.triggerType, "actor");
    assert.equal(checkpoint.previousCheckpointId, index ? ledger.checkpoints[index - 1].id : null);
    assert.equal(checkpoint.previousRoot, index ? ledger.checkpoints[index - 1].root : null);
  }
});

test("successful and failed model invocations checkpoint without raw prompt leakage", async () => {
  const ledger = new custody.CustodyLedger();
  const secretPrompt = "Patient private prompt: code blue flamingo";
  const succeeded = await ledger.appendModelInvocationFCO({
    timestamp: "2026-09-26T21:00:00Z",
    provider: "openai",
    model: "care-model-1",
    prompt: secretPrompt,
    outcome: "success",
    responseSummary: "Generated a bounded draft.",
  });
  const failed = await ledger.appendModelInvocationFCO({
    timestamp: "2026-09-26T21:01:00Z",
    provider: "openai",
    model: "care-model-1",
    prompt: secretPrompt,
    outcome: "failure",
    errorCode: "TIMEOUT",
  });

  assert.equal(succeeded.fco.fcoType, "model-invocation");
  assert.equal(succeeded.fco.invocationOutcome, "success");
  assert.equal(failed.fco.invocationOutcome, "failure");
  assert.equal(succeeded.checkpoint.triggerType, "model-invocation");
  assert.equal(failed.checkpoint.triggerId, failed.fco.id);
  assert.equal(succeeded.fco.promptHash, failed.fco.promptHash);
  assert.equal(JSON.stringify({ fcos: ledger.fcos, checkpoints: ledger.checkpoints }).includes(secretPrompt), false);
});

test("checkpoint replay is deterministic", async () => {
  const ledger = new custody.CustodyLedger();
  await ledger.appendActorFCO({ ...base, role: "caregiver" });
  await ledger.appendModelInvocationFCO({
    timestamp: "2026-09-26T21:00:00Z",
    provider: "local",
    model: "care-model-1",
    prompt: "private",
    outcome: "success",
    responseSummary: "Draft generated.",
  });

  const replayed = await custody.CustodyLedger.replay(ledger.fcos);
  assert.deepEqual(replayed.checkpoints, ledger.checkpoints);
  assert.equal(replayed.root, ledger.root);
});
