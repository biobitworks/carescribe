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
