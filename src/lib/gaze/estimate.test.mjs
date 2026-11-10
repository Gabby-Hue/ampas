import test from "node:test";
import assert from "node:assert/strict";
import { estimateRelativeIrisPosition } from "./estimate.ts";

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
