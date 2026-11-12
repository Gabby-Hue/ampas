import type { TestMode } from "./context";

export type TrialKind = "go" | "no-go";
export type TrialResponse = "hit" | "omission" | "commission" | "correct-rejection";
export type BlockPhase = "baseline" | "routine" | "boredom" | "endurance" | "inrush" | "recovery";

export type CptTrial = {
  index: number;
  kind: TrialKind;
  delayMs: number;
  blockIndex?: number;
  blockPhase?: BlockPhase;
};

export type CptEvent = CptTrial & {
  shownAt: number;
  respondedAt?: number;
  response?: TrialResponse;
};

export type CptMetrics = {
  totalTrials: number;
  goTrials: number;
  noGoTrials: number;
  hits: number;
  omissions: number;
  commissions: number;
  correctRejections: number;
  hitRate: number;
  omissionRate: number;
  commissionRate: number;
  medianReactionTimeMs: number | null;
  reactionTimeVariabilityMs: number | null;
};

export type ClinicalStats = {
  dPrime: number | null;
  anticipatoryResponses: number;
  attentionLapses: number;
  fatigueSlope: number | null;
  rtSlopeMsPerBlock: number | null;
};

export type CptFixture = { seed: number; trialCount: number };

export const CLINICAL_DURATION_MS = 360_000; // 6 menit (6 blok x 60 detik)
export const QUICK_DURATION_MS = 90_000; // 90 detik (3 blok x 30 detik)

export const BLOCK_PHASE_LABELS: Record<BlockPhase, string> = {
  baseline: "Baseline Acquisition",
  routine: "Sustained Routine",
  boredom: "Low-Frequency Vigilance",
  endurance: "Vigilance Endurance",
  inrush: "High-Demand Impulsivity",
  recovery: "Exhaustion Recovery",
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createCptTrials({ seed, trialCount }: CptFixture): CptTrial[] {
  const random = seededRandom(seed);
  return Array.from({ length: trialCount }, (_, index) => ({
    index,
    kind: random() < 0.7 ? "go" : "no-go",
    delayMs: 1000 + Math.floor(random() * 1201),
  }));
}

type BlockSpec = {
  phase: BlockPhase;
  goRatio: number;
  minIsiMs: number;
  maxIsiMs: number;
  trialCount: number;
};

const CLINICAL_BLOCKS: BlockSpec[] = [
  { phase: "baseline", goRatio: 0.70, minIsiMs: 1000, maxIsiMs: 2000, trialCount: 40 },
  { phase: "routine", goRatio: 0.70, minIsiMs: 1000, maxIsiMs: 2000, trialCount: 40 },
  { phase: "boredom", goRatio: 0.30, minIsiMs: 1200, maxIsiMs: 2200, trialCount: 36 },
  { phase: "endurance", goRatio: 0.30, minIsiMs: 1200, maxIsiMs: 2200, trialCount: 36 },
  { phase: "inrush", goRatio: 0.85, minIsiMs: 900, maxIsiMs: 1600, trialCount: 48 },
  { phase: "recovery", goRatio: 0.50, minIsiMs: 1000, maxIsiMs: 2000, trialCount: 40 },
];

const QUICK_BLOCKS: BlockSpec[] = [
  { phase: "baseline", goRatio: 0.70, minIsiMs: 1000, maxIsiMs: 1800, trialCount: 22 },
  { phase: "boredom", goRatio: 0.30, minIsiMs: 1100, maxIsiMs: 2000, trialCount: 20 },
  { phase: "inrush", goRatio: 0.85, minIsiMs: 900, maxIsiMs: 1500, trialCount: 25 },
];

export function createStructuredCptTrials(mode: TestMode, seed = 20261111): CptTrial[] {
  const random = seededRandom(seed);
  const specs = mode === "clinical" ? CLINICAL_BLOCKS : QUICK_BLOCKS;
  const trials: CptTrial[] = [];
  let globalIndex = 0;

  specs.forEach((spec, blockIndex) => {
    for (let i = 0; i < spec.trialCount; i++) {
      const span = spec.maxIsiMs - spec.minIsiMs + 1;
      trials.push({
        index: globalIndex++,
        kind: random() < spec.goRatio ? "go" : "no-go",
        delayMs: spec.minIsiMs + Math.floor(random() * span),
        blockIndex,
        blockPhase: spec.phase,
      });
    }
  });

  return trials;
}

export function classifyResponse(kind: TrialKind, responded: boolean): TrialResponse {
  if (!responded) return kind === "go" ? "omission" : "correct-rejection";
  return kind === "go" ? "hit" : "commission";
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

export function calculateCptMetrics(events: CptEvent[]): CptMetrics {
  const go = events.filter((event) => event.kind === "go");
  const noGo = events.filter((event) => event.kind === "no-go");
  const hits = events.filter((event) => event.response === "hit");
  const omissions = events.filter((event) => event.response === "omission");
  const commissions = events.filter((event) => event.response === "commission");
  const correctRejections = events.filter((event) => event.response === "correct-rejection");
  const reactionTimes = hits.flatMap((event) =>
    event.respondedAt === undefined ? [] : [Math.max(0, event.respondedAt - event.shownAt)]
  );
  const average = mean(reactionTimes);
  const variance = reactionTimes.length ? mean(reactionTimes.map((value) => (value - average) ** 2)) : 0;
  return {
    totalTrials: events.length,
    goTrials: go.length,
    noGoTrials: noGo.length,
    hits: hits.length,
    omissions: omissions.length,
    commissions: commissions.length,
    correctRejections: correctRejections.length,
    hitRate: go.length ? hits.length / go.length : 0,
    omissionRate: go.length ? omissions.length / go.length : 0,
    commissionRate: noGo.length ? commissions.length / noGo.length : 0,
    medianReactionTimeMs: median(reactionTimes),
    reactionTimeVariabilityMs: reactionTimes.length ? Math.round(Math.sqrt(variance)) : null,
  };
}

function normInv(p: number): number {
  const clamped = Math.max(1e-6, Math.min(1 - 1e-6, p));
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (clamped < pLow) {
    const q = Math.sqrt(-2 * Math.log(clamped));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (clamped <= pHigh) {
    const q = clamped - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - clamped));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function linearSlope(values: number[]): number | null {
  if (values.length < 2) return null;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export const DEMO_FIXTURE: CptFixture = { seed: 20261010, trialCount: 42 };

export type AttentionBlock = {
  index: number;
  label: string;
  blockPhase?: BlockPhase;
  hitRate: number;
  omissionRate: number;
  commissionRate: number;
  medianRtMs: number | null;
  rtVariabilityMs: number | null;
  trialCount: number;
};

export function calculateAttentionBlocks(events: CptEvent[], blockCount = 6): AttentionBlock[] {
  if (!events.length) return [];

  const hasExplicitBlocks = events.some((event) => typeof event.blockIndex === "number");
  if (hasExplicitBlocks) {
    const grouped = new Map<number, CptEvent[]>();
    for (const event of events) {
      const idx = event.blockIndex ?? 0;
      const arr = grouped.get(idx) ?? [];
      arr.push(event);
      grouped.set(idx, arr);
    }
    const keys = [...grouped.keys()].sort((a, b) => a - b);
    return keys.map((idx) => {
      const block = grouped.get(idx) ?? [];
      const go = block.filter((event) => event.kind === "go");
      const noGo = block.filter((event) => event.kind === "no-go");
      const hits = go.filter((event) => event.response === "hit");
      const rts = hits.flatMap((event) =>
        event.respondedAt === undefined ? [] : [Math.max(0, event.respondedAt - event.shownAt)]
      );
      const avgRt = mean(rts);
      const varRt = rts.length ? mean(rts.map((v) => (v - avgRt) ** 2)) : 0;
      return {
        index: idx,
        label: `Block ${idx + 1}`,
        blockPhase: block[0]?.blockPhase,
        hitRate: go.length ? hits.length / go.length : 0,
        omissionRate: go.length ? go.filter((event) => event.response === "omission").length / go.length : 0,
        commissionRate: noGo.length ? noGo.filter((event) => event.response === "commission").length / noGo.length : 0,
        medianRtMs: median(rts),
        rtVariabilityMs: rts.length ? Math.round(Math.sqrt(varRt)) : null,
        trialCount: block.length,
      };
    });
  }

  return Array.from({ length: blockCount }, (_, index) => {
    const start = Math.floor((index * events.length) / blockCount);
    const end = Math.floor(((index + 1) * events.length) / blockCount);
    const block = events.slice(start, Math.max(start + 1, end));
    const go = block.filter((event) => event.kind === "go");
    const noGo = block.filter((event) => event.kind === "no-go");
    const hits = go.filter((event) => event.response === "hit");
    const rts = hits.flatMap((event) =>
      event.respondedAt === undefined ? [] : [Math.max(0, event.respondedAt - event.shownAt)]
    );
    const avgRt = mean(rts);
    const varRt = rts.length ? mean(rts.map((v) => (v - avgRt) ** 2)) : 0;
    return {
      index,
      label: `Block ${index + 1}`,
      hitRate: go.length ? hits.length / go.length : 0,
      omissionRate: go.length ? go.filter((event) => event.response === "omission").length / go.length : 0,
      commissionRate: noGo.length ? noGo.filter((event) => event.response === "commission").length / noGo.length : 0,
      medianRtMs: median(rts),
      rtVariabilityMs: rts.length ? Math.round(Math.sqrt(varRt)) : null,
      trialCount: block.length,
    };
  });
}

export function calculateClinicalStats(events: CptEvent[]): ClinicalStats {
  const metrics = calculateCptMetrics(events);
  let dPrime: number | null = null;
  if (metrics.goTrials > 0 && metrics.noGoTrials > 0) {
    const hitAdj = (metrics.hits + 0.5) / (metrics.goTrials + 1);
    const faAdj = (metrics.commissions + 0.5) / (metrics.noGoTrials + 1);
    dPrime = Math.round((normInv(hitAdj) - normInv(faAdj)) * 100) / 100;
  }

  const respondedEvents = events.filter((e) => e.respondedAt !== undefined);
  const anticipatoryResponses = respondedEvents.filter(
    (e) => e.respondedAt! - e.shownAt < 120
  ).length;
  const attentionLapses = events.filter(
    (e) => e.response === "hit" && e.respondedAt !== undefined && e.respondedAt - e.shownAt > 750
  ).length;

  const blocks = calculateAttentionBlocks(events);
  const hitRates = blocks.map((b) => b.hitRate);
  const rts = blocks.map((b) => b.medianRtMs).filter((rt): rt is number => rt !== null);

  const rawFatigueSlope = linearSlope(hitRates);
  const rawRtSlope = linearSlope(rts);

  return {
    dPrime,
    anticipatoryResponses,
    attentionLapses,
    fatigueSlope: rawFatigueSlope !== null ? Math.round(rawFatigueSlope * 1000) / 1000 : null,
    rtSlopeMsPerBlock: rawRtSlope !== null ? Math.round(rawRtSlope * 10) / 10 : null,
  };
}
