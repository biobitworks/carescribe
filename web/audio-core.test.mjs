import assert from "node:assert/strict";
import test from "node:test";

import { StreamingPcmEncoder } from "./audio-core.mjs";

test("48 kHz browser audio is resampled and batched as 16 kHz PCM", () => {
  const encoder = new StreamingPcmEncoder({
    inputRate: 48_000,
    outputRate: 16_000,
    frameSamples: 320,
  });
  const input = Float32Array.from(
    { length: 960 },
    (_, index) => Math.sin(index / 20) * 0.5,
  );

  const frames = encoder.push(input);

  assert.equal(frames.length, 1);
  assert.equal(frames[0] instanceof Int16Array, true);
  assert.equal(frames[0].length, 320);
  assert.equal(frames[0].some(sample => sample !== 0), true);
});

test("44.1 kHz resampling preserves long-run 16 kHz frame cadence", () => {
  const encoder = new StreamingPcmEncoder({
    inputRate: 44_100,
    outputRate: 16_000,
    frameSamples: 320,
  });

  const frames = encoder.push(new Float32Array(4_410).fill(0.25));

  assert.equal(frames.length, 5);
  assert.equal(frames.reduce((total, frame) => total + frame.length, 0), 1_600);
});

test("trailing silence creates a bounded VAD pause", () => {
  const encoder = new StreamingPcmEncoder({
    inputRate: 16_000,
    outputRate: 16_000,
    frameSamples: 320,
  });

  const frames = encoder.trailingSilence(800);

  assert.equal(frames.length, 40);
  assert.equal(frames.every(frame => frame.every(sample => sample === 0)), true);
});
