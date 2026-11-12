import test from "node:test";
import assert from "node:assert/strict";
import { applyGazeCalibration, estimateFaceDiagnostics, estimateRelativeIrisPosition } from "./estimate.ts";

function face(offsetX = 0, offsetY = 0) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  const set = (index, x, y) => { points[index] = { x: x + offsetX, y: y + offsetY }; };
  set(33, .2, .4); set(133, .4, .4); set(159, .3, .35); set(145, .3, .45);
  set(362, .6, .4); set(263, .8, .4); set(386, .7, .35); set(374, .7, .45);
  for (let index = 468; index <= 472; index++) set(index, .3, .4);
  for (let index = 473; index <= 477; index++) set(index, .7, .4);
  return points;
}

test("relative iris position stays stable when the entire face shifts", () => {
  const centered = estimateRelativeIrisPosition(face());
  const shifted = estimateRelativeIrisPosition(face(.1, .1));
  assert.equal(centered.valid, true);
  assert.ok(Math.abs(centered.x - shifted.x) < 1e-9);
  assert.ok(Math.abs(centered.y - shifted.y) < 1e-9);
});

test("relative iris position rejects missing landmarks", () => {
  assert.equal(estimateRelativeIrisPosition([]).valid, false);
});

test("estimateFaceDiagnostics detects centered optimal face and applyGazeCalibration normalizes", () => {
  const pts = face();
  pts[1] = { x: 0.5, y: 0.5 };
  const diag = estimateFaceDiagnostics(pts);
  assert.equal(diag.faceDetected, true);
  assert.equal(diag.faceCentered, true);

  const calibrated = applyGazeCalibration(
    { x: 0.55, y: 0.5, valid: true },
    { minX: 0.4, maxX: 0.6, minY: 0.4, maxY: 0.6, centerX: 0.5, centerY: 0.5 }
  );
  assert.equal(calibrated.valid, true);
  assert.ok(calibrated.x > 0.5 && calibrated.x <= 1);
});
