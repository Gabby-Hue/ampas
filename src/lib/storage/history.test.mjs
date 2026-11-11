import test from "node:test";
import assert from "node:assert/strict";
import { saveSessionToHistory, getUserSessions, calculateUserTrends } from "./history.ts";

test("saveSessionToHistory stores session tied to specific user ID", () => {
  const allSessions = [];
  const entry = {
    sessionId: "OC-1",
    userId: "usr_budi",
    date: Date.now(),
    durationSeconds: 60,
    asrsTotalScore: 14,
    asrsSignificant: true,
    medianRtMs: 380,
    hitRate: 0.95,
    omissions: 1,
    commissions: 2,
    gazeStatus: "usable",
  };

  saveSessionToHistory(allSessions, entry);
  assert.equal(allSessions.length, 1);

  const budiSessions = getUserSessions(allSessions, "usr_budi");
  assert.equal(budiSessions.length, 1);
  assert.equal(budiSessions[0].sessionId, "OC-1");

  const otherSessions = getUserSessions(allSessions, "usr_siti");
  assert.equal(otherSessions.length, 0);
});

test("calculateUserTrends computes correct averages and total tests", () => {
  const sessions = [
    { sessionId: "OC-1", userId: "u1", date: 1, durationSeconds: 60, asrsTotalScore: 10, asrsSignificant: false, medianRtMs: 400, hitRate: 0.9, omissions: 2, commissions: 2, gazeStatus: "usable" },
    { sessionId: "OC-2", userId: "u1", date: 2, durationSeconds: 60, asrsTotalScore: 14, asrsSignificant: true, medianRtMs: 360, hitRate: 1.0, omissions: 0, commissions: 1, gazeStatus: "usable" },
  ];

  const trends = calculateUserTrends(sessions);
  assert.equal(trends.totalCompleted, 2);
  assert.equal(trends.avgMedianRt, 380);
  assert.equal(trends.avgHitRate, 0.95);
});
