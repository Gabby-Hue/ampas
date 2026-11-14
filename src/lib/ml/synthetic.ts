/**
 * Synthetic ADHD vs Neurotypical dataset generator.
 * Models distributional differences observed in literature:
 * - ADHD: higher commission/omission, elevated RTV, higher tau (ex-Gaussian), faster median RT but more variable
 * - NT: lower error rates, stable RT, lower tau
 */

export type FeatureVector = {
  commission_rate: number;
  omission_rate: number;
  median_rt_ms: number;
  rt_variability_ms: number;
  d_prime: number | null;
  fatigue_slope: number | null;
  tau_ms: number | null;
  asrs_score: number;
};

export type LabeledSample = { features: FeatureVector; label: "adhd" | "nt" };

// Seeded PRNG (same as engine.ts)
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randn(rng: () => number): number {
  // Box-Muller transform
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateAdhdProfile(rng: () => number): FeatureVector {
  return {
    commission_rate: clamp(0.20 + randn(rng) * 0.08, 0.05, 0.55),
    omission_rate: clamp(0.12 + randn(rng) * 0.06, 0.02, 0.35),
    median_rt_ms: Math.round(clamp(370 + randn(rng) * 40, 220, 520)),
    rt_variability_ms: Math.round(clamp(110 + randn(rng) * 30, 50, 200)),
    d_prime: clamp(1.2 + randn(rng) * 0.5, 0.4, 2.5),
    fatigue_slope: clamp(-0.06 + randn(rng) * 0.02, -0.15, -0.01),
    tau_ms: Math.round(clamp(45 + randn(rng) * 15, 10, 90)),
    asrs_score: Math.round(clamp(10 + randn(rng) * 3, 4, 24)),
  };
}

export function generateNeurotypicalProfile(rng: () => number): FeatureVector {
  return {
    commission_rate: clamp(0.06 + randn(rng) * 0.04, 0.01, 0.20),
    omission_rate: clamp(0.06 + randn(rng) * 0.03, 0.01, 0.18),
    median_rt_ms: Math.round(clamp(440 + randn(rng) * 35, 300, 580)),
    rt_variability_ms: Math.round(clamp(60 + randn(rng) * 20, 25, 110)),
    d_prime: clamp(2.0 + randn(rng) * 0.4, 1.0, 3.2),
    fatigue_slope: clamp(-0.01 + randn(rng) * 0.02, -0.06, 0.04),
    tau_ms: Math.round(clamp(20 + randn(rng) * 8, 3, 50)),
    asrs_score: Math.round(clamp(4 + randn(rng) * 2, 0, 12)),
  };
}

export function generateLabeledDataset(nPerClass: number, seed = 42): LabeledSample[] {
  const rng = seededRandom(seed);
  const samples: LabeledSample[] = [];

  for (let i = 0; i < nPerClass; i++) {
    samples.push({ features: generateAdhdProfile(rng), label: "adhd" });
  }
  for (let i = 0; i < nPerClass; i++) {
    samples.push({ features: generateNeurotypicalProfile(rng), label: "nt" });
  }

  return samples;
}

export function extractFeatureArray(sample: FeatureVector): number[] {
  return [
    sample.commission_rate,
    sample.omission_rate,
    sample.median_rt_ms / 600, // normalize to ~0-1 range
    sample.rt_variability_ms / 200,
    (sample.d_prime ?? 1.5) / 3.0,
    (sample.fatigue_slope ?? -0.02) * 10,
    (sample.tau_ms ?? 25) / 100, // normalize ms (10-90ms) to ~0.1-0.9
    sample.asrs_score / 24,
  ];
}
