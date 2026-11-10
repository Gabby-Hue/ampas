import test from "node:test";
import assert from "node:assert/strict";
import { scoreAsrs } from "./asrs.ts";

test("scoreAsrs mengidentifikasi hasil signifikan jika >= 4 item di atas ambang", () => {
  const positiveAnswers = { 1: 3, 2: 2, 3: 4, 4: 2, 5: 1, 6: 0 };
  const res = scoreAsrs(positiveAnswers);
  assert.equal(res.significantCount, 4);
  assert.equal(res.isSignificant, true);
  assert.equal(res.totalScore, 12);
});

test("scoreAsrs mengidentifikasi hasil normal jika < 4 item di atas ambang", () => {
  const normalAnswers = { 1: 1, 2: 2, 3: 0, 4: 1, 5: 0, 6: 1 };
  const res = scoreAsrs(normalAnswers);
  assert.equal(res.significantCount, 1);
  assert.equal(res.isSignificant, false);
  assert.equal(res.totalScore, 5);
});
