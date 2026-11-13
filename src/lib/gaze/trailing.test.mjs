import test from "node:test";
import assert from "node:assert/strict";
import { calculateTrailingMetrics, generateDemoTrailingSamples } from "./trailing.ts";

test("calculateTrailingMetrics returns insufficient_data for small sample sets", () => {
  const result = calculateTrailingMetrics([]);
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.accuracyPercent, 0);
});

test("calculateTrailingMetrics correctly classifies stable smooth pursuit", () => {
  const stableSamples = generateDemoTrailingSamples("stable");
  assert.equal(stableSamples.length, 100);
  const result = calculateTrailingMetrics(stableSamples);
  assert.equal(result.status, "optimal");
  assert.ok(result.accuracyPercent >= 80, `Expected accuracy >= 80, got ${result.accuracyPercent}`);
  assert.ok(result.meanDeviation < 0.08, `Expected mean deviation < 0.08, got ${result.meanDeviation}`);
});

test("calculateTrailingMetrics detects intrusive saccades in variable profile", () => {
  const variableSamples = generateDemoTrailingSamples("variable");
  const result = calculateTrailingMetrics(variableSamples);
  assert.ok(result.intrusiveSaccades >= 2, `Expected >= 2 intrusive saccades, got ${result.intrusiveSaccades}`);
  assert.ok(result.status === "moderate_lag" || result.status === "high_dispersion");
});
