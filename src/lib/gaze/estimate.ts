import type { GazeSample } from "./quality";

type Point = { x: number; y: number };

function center(points: Point[]): Point {
  return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
}

export function estimateRelativeIrisPosition(landmarks: Point[]): GazeSample {
  // Face Landmarker with refined landmarks supplies iris indices 468–477.
  const indices = [33, 133, 159, 145, 362, 263, 386, 374, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477];
  if (indices.some((index) => !landmarks[index] || !Number.isFinite(landmarks[index].x) || !Number.isFinite(landmarks[index].y))) {
    return { x: 0, y: 0, valid: false };
  }
  const leftIris = center(landmarks.slice(468, 473));
  const rightIris = center(landmarks.slice(473, 478));
  const leftWidth = Math.abs(landmarks[33].x - landmarks[133].x);
  const rightWidth = Math.abs(landmarks[362].x - landmarks[263].x);
  const leftHeight = Math.abs(landmarks[159].y - landmarks[145].y);
  const rightHeight = Math.abs(landmarks[386].y - landmarks[374].y);
  if (Math.min(leftWidth, rightWidth, leftHeight, rightHeight) < 0.001) return { x: 0, y: 0, valid: false };
  const leftX = (leftIris.x - Math.min(landmarks[33].x, landmarks[133].x)) / leftWidth;
  const rightX = (rightIris.x - Math.min(landmarks[362].x, landmarks[263].x)) / rightWidth;
  const leftY = (leftIris.y - Math.min(landmarks[159].y, landmarks[145].y)) / leftHeight;
  const rightY = (rightIris.y - Math.min(landmarks[386].y, landmarks[374].y)) / rightHeight;
  const x = (leftX + rightX) / 2;
  const y = (leftY + rightY) / 2;
  return { x, y, valid: Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}
