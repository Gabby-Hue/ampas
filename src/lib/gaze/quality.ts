export type GazeSample = { x: number; y: number; valid: boolean; recordedAt?: number };
export type GazeQuality = { status: "usable" | "limited" | "unavailable"; reason: "no-samples" | "low-coverage" | "insufficient-samples" | "ready"; coverage: number; relativeDispersion: number; validSamples: number };
export const MINIMUM_VALID_SAMPLES = 10;

export function calculateGazeQuality(samples: GazeSample[], minimumCoverage = 0.5): GazeQuality {
  if (!samples.length) return { status: "unavailable", reason: "no-samples", coverage: 0, relativeDispersion: 0, validSamples: 0 };
  const valid = samples.filter((sample) => sample.valid && Number.isFinite(sample.x) && Number.isFinite(sample.y));
  const coverage = valid.length / samples.length;
  if (!valid.length) return { status: "unavailable", reason: "low-coverage", coverage, relativeDispersion: 0, validSamples: 0 };
  const meanX = valid.reduce((sum, sample) => sum + sample.x, 0) / valid.length;
  const meanY = valid.reduce((sum, sample) => sum + sample.y, 0) / valid.length;
  const squaredDistance = valid.map((sample) => (sample.x - meanX) ** 2 + (sample.y - meanY) ** 2);
  const relativeDispersion = Math.sqrt(squaredDistance.reduce((sum, value) => sum + value, 0) / valid.length);
  const enoughCoverage = coverage >= minimumCoverage;
  const enoughSamples = valid.length >= MINIMUM_VALID_SAMPLES;
  return { status: enoughCoverage && enoughSamples ? "usable" : "limited", reason: enoughCoverage ? enoughSamples ? "ready" : "insufficient-samples" : "low-coverage", coverage, relativeDispersion, validSamples: valid.length };
}

export function calculateOutOfBoundsRate(samples: GazeSample[]): number {
  const valid = samples.filter((sample) => sample.valid && Number.isFinite(sample.x) && Number.isFinite(sample.y));
  if (!valid.length) return 0;
  const outCount = valid.filter((s) => s.x < 0.15 || s.x > 0.85 || s.y < 0.15 || s.y > 0.85).length;
  return Math.round((outCount / valid.length) * 1000) / 1000;
}

/**
 * Gaze Dispersion Index (GDI) — Euclidean distance of gaze samples from a target point.
 * Returns null if no valid samples available.
 * Values in normalized screen coordinates (0-1), so distance is in "screen units".
 */
export function calculateGdi(samples: GazeSample[], targetX: number, targetY: number): number | null {
  const valid = samples.filter((s) => s.valid && Number.isFinite(s.x) && Number.isFinite(s.y));
  if (valid.length === 0) return null;
  const sqDists = valid.map((s) => (s.x - targetX) ** 2 + (s.y - targetY) ** 2);
  const meanSqDist = sqDists.reduce((a, b) => a + b, 0) / valid.length;
  return Math.sqrt(meanSqDist);
}

/**
 * Filter gaze samples within a time window [startMs, endMs].
 * Samples without recordedAt are excluded.
 */
export function filterGazeWindow(samples: GazeSample[], startMs: number, endMs: number): GazeSample[] {
  return samples.filter((s) =>
    s.recordedAt !== undefined && s.recordedAt >= startMs && s.recordedAt <= endMs
  );
}
