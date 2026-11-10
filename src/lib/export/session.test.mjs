import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionExport } from "./session.ts";

const metrics = { goTrials: 3, noGoTrials: 2, hits: 2, omissions: 1, commissions: 1, correctRejections: 1, hitRate: .667, omissionRate: .333, commissionRate: .5, medianReactionTimeMs: 420, reactionTimeVariabilityMs: 20, totalTrials: 5 };
const gaze = { status: "usable", reason: "ready", coverage: .9, relativeDispersion: .04, validSamples: 20 };

test("session export contains aggregate metrics only", () => {
  const payload = buildSessionExport("OC-TEST", false, metrics, gaze);
  assert.equal(payload.session_id, "OC-TEST");
  assert.equal(payload.gaze.status, "usable");
  assert.equal("video" in payload, false);
  assert.equal("frame" in payload, false);
  assert.equal("name" in payload, false);
});

test("synthetic export cannot inherit sensor data", () => {
  const payload = buildSessionExport("DEMO-STABLE", true, metrics, gaze);
  assert.equal(payload.synthetic_demo, true);
  assert.equal(payload.duration_seconds, 0);
  assert.equal(payload.gaze.status, "unavailable");
  assert.equal(payload.gaze.reason, "synthetic-demo");
  assert.equal(payload.gaze.data_coverage, 0);
});
