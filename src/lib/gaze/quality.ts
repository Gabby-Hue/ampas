export type GazeSample = { x: number; y: number; valid: boolean };
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
