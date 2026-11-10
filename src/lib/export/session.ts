import type { CptMetrics } from "../cpt/engine";
import type { GazeQuality } from "../gaze/quality";
import type { AsrsResult } from "../cpt/asrs";

export type SessionExport = {
  session_id: string;
  test_version: "2.0";
  synthetic_demo: boolean;
  duration_seconds: number;
  asrs?: {
    total_score: number;
    significant_items: number;
    is_significant: boolean;
    clinical_summary: string;
  };
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

export function buildSessionExport(
  sessionId: string,
  isDemo: boolean,
  metrics: CptMetrics,
  gaze: GazeQuality,
  asrs?: AsrsResult | null
): SessionExport {
  return {
    session_id: sessionId || "OC-LOCAL",
    test_version: "2.0",
    synthetic_demo: isDemo,
    duration_seconds: isDemo ? 0 : 60,
    asrs: asrs ? {
      total_score: asrs.totalScore,
      significant_items: asrs.significantCount,
      is_significant: asrs.isSignificant,
      clinical_summary: asrs.interpretationClinical,
    } : undefined,
    cpt: { go_trials: metrics.goTrials, no_go_trials: metrics.noGoTrials, hits: metrics.hits, omissions: metrics.omissions, commissions: metrics.commissions, correct_rejections: metrics.correctRejections, hit_rate: metrics.hitRate, omission_rate: metrics.omissionRate, commission_rate: metrics.commissionRate, median_rt_ms: metrics.medianReactionTimeMs, rt_variability_ms: metrics.reactionTimeVariabilityMs },
    gaze: { status: isDemo ? "unavailable" : gaze.status, reason: isDemo ? "synthetic-demo" : gaze.reason, data_coverage: isDemo ? 0 : gaze.coverage, relative_dispersion: isDemo ? 0 : gaze.relativeDispersion },
  };
}
