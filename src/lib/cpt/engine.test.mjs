import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAttentionBlocks,
  calculateCptMetrics,
  classifyResponse,
  createCptTrials,
} from "./engine.ts";

test("Go/No-Go mengklasifikasikan respons dan diam dengan benar", () => {
  assert.equal(classifyResponse("go", true), "hit");
  assert.equal(classifyResponse("go", false), "omission");
  assert.equal(classifyResponse("no-go", true), "commission");
  assert.equal(classifyResponse("no-go", false), "correct-rejection");
});

test("seed menghasilkan urutan dan interval yang dapat diulang", () => {
  const fixture = { seed: 20261010, trialCount: 42 };
  const first = createCptTrials(fixture);
  assert.deepEqual(first, createCptTrials(fixture));
  assert.notDeepEqual(first, createCptTrials({ ...fixture, seed: fixture.seed + 1 }));
  assert.equal(first.length, fixture.trialCount);
  assert.ok(first.every((trial) => trial.delayMs >= 1000 && trial.delayMs <= 2200));
});

test("metrik memakai denominator Go dan No-Go yang tepat", () => {
  const events = [
    { index: 0, kind: "go", delayMs: 1000, shownAt: 100, respondedAt: 500, response: "hit" },
    { index: 1, kind: "go", delayMs: 1000, shownAt: 1100, response: "omission" },
    { index: 2, kind: "no-go", delayMs: 1000, shownAt: 2100, response: "correct-rejection" },
    { index: 3, kind: "no-go", delayMs: 1000, shownAt: 3100, respondedAt: 3300, response: "commission" },
  ];
  const result = calculateCptMetrics(events);
  assert.equal(result.totalTrials, 4);
  assert.equal(result.hits, 1);
  assert.equal(result.omissions, 1);
  assert.equal(result.commissions, 1);
  assert.equal(result.correctRejections, 1);
  assert.equal(result.hitRate, 0.5);
  assert.equal(result.omissionRate, 0.5);
  assert.equal(result.commissionRate, 0.5);
  assert.equal(result.medianReactionTimeMs, 400);
  assert.equal(result.reactionTimeVariabilityMs, 0);
  assert.deepEqual(calculateAttentionBlocks(events, 2).map((block) => block.hitRate), [0.5, 0]);
});

test("tanpa hit, reaction time dinyatakan tidak tersedia", () => {
  const result = calculateCptMetrics([
    { index: 0, kind: "go", delayMs: 1000, shownAt: 100, response: "omission" },
  ]);
  assert.equal(result.medianReactionTimeMs, null);
  assert.equal(result.reactionTimeVariabilityMs, null);
});
