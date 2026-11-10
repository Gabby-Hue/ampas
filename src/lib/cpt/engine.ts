export type TrialKind = "go" | "no-go";
export type TrialResponse = "hit" | "omission" | "commission" | "correct-rejection";

export type CptTrial = {
  index: number;
  kind: TrialKind;
  delayMs: number;
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

export type CptFixture = { seed: number; trialCount: number };

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

function mean(values: number[]) { return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0; }

export function calculateCptMetrics(events: CptEvent[]): CptMetrics {
  const go = events.filter((event) => event.kind === "go");
  const noGo = events.filter((event) => event.kind === "no-go");
  const hits = events.filter((event) => event.response === "hit");
  const omissions = events.filter((event) => event.response === "omission");
  const commissions = events.filter((event) => event.response === "commission");
  const correctRejections = events.filter((event) => event.response === "correct-rejection");
  const reactionTimes = hits.flatMap((event) => event.respondedAt === undefined ? [] : [event.respondedAt - event.shownAt]);
  const average = mean(reactionTimes);
  const variance = reactionTimes.length ? mean(reactionTimes.map((value) => (value - average) ** 2)) : 0;
  return {
    totalTrials: events.length, goTrials: go.length, noGoTrials: noGo.length,
    hits: hits.length, omissions: omissions.length, commissions: commissions.length, correctRejections: correctRejections.length,
    hitRate: go.length ? hits.length / go.length : 0,
    omissionRate: go.length ? omissions.length / go.length : 0,
    commissionRate: noGo.length ? commissions.length / noGo.length : 0,
    medianReactionTimeMs: median(reactionTimes),
    reactionTimeVariabilityMs: reactionTimes.length ? Math.round(Math.sqrt(variance)) : null,
  };
}

export const DEMO_FIXTURE: CptFixture = { seed: 20261010, trialCount: 42 };

export type AttentionBlock = {
  index: number;
  label: string;
  hitRate: number;
  omissionRate: number;
  commissionRate: number;
  trialCount: number;
};

export function calculateAttentionBlocks(events: CptEvent[], blockCount = 6): AttentionBlock[] {
  if (!events.length) return [];
  return Array.from({ length: blockCount }, (_, index) => {
    const start = Math.floor(index * events.length / blockCount);
    const end = Math.floor((index + 1) * events.length / blockCount);
    const block = events.slice(start, Math.max(start + 1, end));
    const go = block.filter((event) => event.kind === "go");
    const noGo = block.filter((event) => event.kind === "no-go");
    return {
      index,
      label: `Block ${index + 1}`,
      hitRate: go.length ? go.filter((event) => event.response === "hit").length / go.length : 0,
      omissionRate: go.length ? go.filter((event) => event.response === "omission").length / go.length : 0,
      commissionRate: noGo.length ? noGo.filter((event) => event.response === "commission").length / noGo.length : 0,
      trialCount: block.length,
    };
  });
}
