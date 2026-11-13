import type { ClinicalStats, CptMetrics } from "../cpt/engine";
import type { GazeQuality } from "../gaze/quality";
import type { AsrsResult } from "../cpt/asrs";
import type { SubjectContext } from "../cpt/context";

export type SessionExport = {
  session_id: string;
  test_version: "2.1";
  test_mode: "clinical" | "quick" | "synthetic";
  synthetic_demo: boolean;
  duration_seconds: number;
  tab_interruptions?: number;
  subject_context?: SubjectContext;
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
    d_prime?: number | null;
    anticipatory_responses?: number;
    attention_lapses?: number;
    fatigue_slope?: number | null;
    rt_slope_ms_per_block?: number | null;
  };
  gaze: {
    status: GazeQuality["status"] | "unavailable";
    reason: string;
    data_coverage: number;
    relative_dispersion: number;
    out_of_bounds_rate?: number;
    mean_gdi?: number | null;
    max_gdi?: number | null;
    trials_with_gaze_data?: number;
  };
  trailing?: {
    accuracy_percent: number;
    mean_deviation: number;
    intrusive_saccades: number;
    status: string;
  };
  ex_gaussian?: {
    mu_ms?: number | null;
    sigma_ms?: number | null;
    tau_ms?: number | null;
  };
};

export function buildSessionExport(
  sessionId: string,
  isDemo: boolean,
  metrics: CptMetrics,
  gaze: GazeQuality,
  asrs?: AsrsResult | null,
  extras?: {
    clinicalStats?: ClinicalStats;
    subjectContext?: SubjectContext;
    durationSeconds?: number;
    tabInterruptions?: number;
    outOfBoundsRate?: number;
    gdiSummary?: { meanGdi: number | null; maxGdi: number | null; trialsWithData: number };
    trailing?: {
      accuracy_percent: number;
      mean_deviation: number;
      intrusive_saccades: number;
      status: string;
    };
  }
): SessionExport {
  const testMode = isDemo ? "synthetic" : (extras?.subjectContext?.testMode ?? "clinical");
  const durationSeconds = isDemo ? 0 : (extras?.durationSeconds ?? 360);

  return {
    session_id: sessionId || "OC-LOCAL",
    test_version: "2.1",
    test_mode: testMode,
    synthetic_demo: isDemo,
    duration_seconds: durationSeconds,
    tab_interruptions: isDemo ? 0 : (extras?.tabInterruptions ?? 0),
    subject_context: isDemo ? undefined : extras?.subjectContext,
    asrs: asrs
      ? {
          total_score: asrs.totalScore,
          significant_items: asrs.significantCount,
          is_significant: asrs.isSignificant,
          clinical_summary: asrs.interpretationClinical,
        }
      : undefined,
    cpt: {
      go_trials: metrics.goTrials,
      no_go_trials: metrics.noGoTrials,
      hits: metrics.hits,
      omissions: metrics.omissions,
      commissions: metrics.commissions,
      correct_rejections: metrics.correctRejections,
      hit_rate: metrics.hitRate,
      omission_rate: metrics.omissionRate,
      commission_rate: metrics.commissionRate,
      median_rt_ms: metrics.medianReactionTimeMs,
      rt_variability_ms: metrics.reactionTimeVariabilityMs,
      ...(extras?.clinicalStats
        ? {
            d_prime: extras.clinicalStats.dPrime,
            anticipatory_responses: extras.clinicalStats.anticipatoryResponses,
            attention_lapses: extras.clinicalStats.attentionLapses,
            fatigue_slope: extras.clinicalStats.fatigueSlope,
            rt_slope_ms_per_block: extras.clinicalStats.rtSlopeMsPerBlock,
          }
        : {}),
    },
    gaze: {
      status: isDemo ? "unavailable" : gaze.status,
      reason: isDemo ? "synthetic-demo" : gaze.reason,
      data_coverage: isDemo ? 0 : gaze.coverage,
      relative_dispersion: isDemo ? 0 : gaze.relativeDispersion,
      ...(isDemo || extras?.outOfBoundsRate === undefined ? {} : { out_of_bounds_rate: extras.outOfBoundsRate }),
      ...(extras?.gdiSummary ? {
        mean_gdi: extras.gdiSummary.meanGdi,
        max_gdi: extras.gdiSummary.maxGdi,
        trials_with_gaze_data: extras.gdiSummary.trialsWithData,
      } : {}),
    },
    trailing: isDemo ? undefined : extras?.trailing,
    ex_gaussian: metrics.exGaussian && metrics.exGaussian.tau !== null ? {
      mu_ms: metrics.exGaussian.mu ?? null,
      sigma_ms: metrics.exGaussian.sigma ?? null,
      tau_ms: metrics.exGaussian.tau ?? null,
    } : undefined,
  };
}
