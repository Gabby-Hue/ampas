import test from "node:test";
import assert from "node:assert/strict";
import { calculateGazeQuality } from "./quality.ts";

test("gaze quality returns unavailable without samples", () => {
  assert.deepEqual(calculateGazeQuality([]), { status: "unavailable", reason: "no-samples", coverage: 0, relativeDispersion: 0, validSamples: 0 });
});

test("gaze quality marks stable valid samples usable", () => {
  const result = calculateGazeQuality(Array.from({ length: 12 }, (_, index) => ({ x: .5 + index * .001, y: .5, valid: true })));
  assert.equal(result.status, "usable");
  assert.equal(result.reason, "ready");
  assert.equal(result.coverage, 1);
  assert.ok(result.relativeDispersion > 0);
});

test("gaze quality keeps a single valid frame limited", () => {
  const result = calculateGazeQuality([{ x: .5, y: .5, valid: true }]);
  assert.equal(result.status, "limited");
  assert.equal(result.reason, "insufficient-samples");
  assert.equal(result.validSamples, 1);
});

test("gaze quality marks sparse samples limited", () => {
  const result = calculateGazeQuality([{ x: .5, y: .5, valid: true }, { x: 0, y: 0, valid: false }, { x: 0, y: 0, valid: false }]);
  assert.equal(result.status, "limited");
  assert.equal(result.reason, "low-coverage");
  assert.equal(result.validSamples, 1);
});
