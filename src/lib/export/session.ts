import type { CptMetrics } from "../cpt/engine";
import type { GazeQuality } from "../gaze/quality";

export type SessionExport = {
  session_id: string;
  test_version: "2.0";
  synthetic_demo: boolean;
  duration_seconds: number;
  cpt: {
    go_trials: number;
    no_go_trials: number;
    hits: number;
    omissions: number;
    commissions: number;
    correct_rejections: number;
    hit_rate: number;
    omission_rate: number;
    commission_rate: number;
    median_rt_ms: number | null;
    rt_variability_ms: number | null;
  };
  gaze: { status: GazeQuality["status"] | "unavailable"; reason: string; data_coverage: number; relative_dispersion: number };
};

export function buildSessionExport(sessionId: string, isDemo: boolean, metrics: CptMetrics, gaze: GazeQuality): SessionExport {
  return {
    session_id: sessionId || "OC-LOCAL",
    test_version: "2.0",
    synthetic_demo: isDemo,
    duration_seconds: isDemo ? 0 : 60,
    cpt: { go_trials: metrics.goTrials, no_go_trials: metrics.noGoTrials, hits: metrics.hits, omissions: metrics.omissions, commissions: metrics.commissions, correct_rejections: metrics.correctRejections, hit_rate: metrics.hitRate, omission_rate: metrics.omissionRate, commission_rate: metrics.commissionRate, median_rt_ms: metrics.medianReactionTimeMs, rt_variability_ms: metrics.reactionTimeVariabilityMs },
    gaze: { status: isDemo ? "unavailable" : gaze.status, reason: isDemo ? "synthetic-demo" : gaze.reason, data_coverage: isDemo ? 0 : gaze.coverage, relative_dispersion: isDemo ? 0 : gaze.relativeDispersion },
  };
}
