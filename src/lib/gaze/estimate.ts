import type { GazeSample } from "./quality";

type Point = { x: number; y: number };

export type DistanceStatus = "optimal" | "too-close" | "too-far" | "unknown";

export type FaceDiagnostics = {
  faceDetected: boolean;
  faceCentered: boolean;
  distanceStatus: DistanceStatus;
  interOcularSpan: number;
  noseX: number;
  noseY: number;
};

export type GazeCalibration = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  leftX?: number;
  rightX?: number;
  topY?: number;
  bottomY?: number;
};

function center(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
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

export function estimateFaceDiagnostics(landmarks: Point[]): FaceDiagnostics {
  if (!landmarks || landmarks.length < 478 || !landmarks[1] || !landmarks[33] || !landmarks[263]) {
    return {
      faceDetected: false,
      faceCentered: false,
      distanceStatus: "unknown",
      interOcularSpan: 0,
      noseX: 0.5,
      noseY: 0.5,
    };
  }

  const nose = landmarks[1];
  const leftOuter = landmarks[33];
  const rightOuter = landmarks[263];
  const span = Math.abs(rightOuter.x - leftOuter.x);

  const faceCentered = nose.x >= 0.34 && nose.x <= 0.66 && nose.y >= 0.30 && nose.y <= 0.72;
  let distanceStatus: DistanceStatus = "optimal";
  if (span < 0.085) distanceStatus = "too-far";
  else if (span > 0.22) distanceStatus = "too-close";

  return {
    faceDetected: true,
    faceCentered,
    distanceStatus,
    interOcularSpan: Math.round(span * 1000) / 1000,
    noseX: nose.x,
    noseY: nose.y,
  };
}

export function applyGazeCalibration(sample: GazeSample, calibration: GazeCalibration | null): GazeSample {
  if (!sample.valid) return sample;
  if (!calibration) {
    return {
      x: Math.max(0, Math.min(1, 1 - sample.x)),
      y: Math.max(0, Math.min(1, sample.y)),
      valid: true,
    };
  }

  const rawDx =
    calibration.leftX !== undefined && calibration.rightX !== undefined
      ? calibration.rightX - calibration.leftX
      : calibration.maxX - calibration.minX;
  const rawDy =
    calibration.topY !== undefined && calibration.bottomY !== undefined
      ? calibration.bottomY - calibration.topY
      : calibration.maxY - calibration.minY;

  const dx = Math.abs(rawDx) >= 0.025 ? rawDx : rawDx < 0 ? -0.06 : 0.06;
  const dy = Math.abs(rawDy) >= 0.025 ? rawDy : rawDy < 0 ? -0.06 : 0.06;

  const normX = 0.5 + ((sample.x - calibration.centerX) / dx) * 0.76;
  const normY = 0.5 + ((sample.y - calibration.centerY) / dy) * 0.76;

  return {
    x: Math.max(0, Math.min(1, normX)),
    y: Math.max(0, Math.min(1, normY)),
    valid: true,
  };
}
