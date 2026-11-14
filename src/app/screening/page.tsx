"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ProfileIconButton } from "@/components/ProfileIconButton";
import { getActiveUser, subscribeAuth, type SafeUser } from "@/lib/auth/auth";
import { persistSessionToStorage } from "@/lib/storage/history";
import {
  CLINICAL_DURATION_MS,
  QUICK_DURATION_MS,
  calculateAttentionBlocks,
  calculateClinicalStats,
  calculateCptMetrics,
  classifyResponse,
  createStructuredCptTrials,
  type CptEvent,
  type CptTrial,
} from "@/lib/cpt/engine";
import { ASRS_OPTIONS, ASRS_QUESTIONS, scoreAsrs, type AsrsResult } from "@/lib/cpt/asrs";
import {
  formatSubjectContextLabel,
  getDefaultTimeOfDay,
  type ScreenExposure,
  type SleepDuration,
  type SubjectContext,
  type TestMode,
} from "@/lib/cpt/context";
import { useGazeTracking } from "@/lib/gaze/tracking";
import type { GazeSample } from "@/lib/gaze/quality";
import { buildSessionExport } from "@/lib/export/session";
import { calculateTrialGdis, summarizeGdiResults } from "@/lib/cpt/engine";
import {
  calculateTrailingMetrics,
  generateDemoTrailingSamples,
  type TrailingSample,
  type TrailingMetrics,
} from "@/lib/gaze/trailing";
import { TrailingVisualization } from "@/components/TrailingVisualization";
import { RadarGazeHeatmap } from "@/components/RadarGazeHeatmap";

type Phase = "questionnaire" | "ready" | "running" | "trailing" | "results";
type Trial = CptEvent;

type ApiAnalysis = {
  source?: string;
  ml_prediction?: {
    model_version: string;
    adhd_probability: number;
    classification: "adhd" | "nt";
    confidence: number;
    trained_on: string;
    accuracy: number;
  };
  layperson_insight: {
    stamina_headline: string;
    stamina_description: string;
    reaction_style_headline: string;
    reaction_style_description: string;
    actionable_habits: string[];
  };
  clinical_referral: {
    diagnostic_impression: string;
    asrs_clinical_correlation: string;
    cpt_psychometric_note: string;
    gaze_stability_note: string;
    provisional_recommendations: string[];
    formal_limitations: string[];
  };
};

const DEMO_STABLE_TRACE: GazeSample[] = Array.from({ length: 64 }, (_, i) => ({
  x: 0.5 + Math.sin(i * 0.4) * 0.035 + (((i * 13) % 7) - 3) * 0.004,
  y: 0.5 + Math.cos(i * 0.4) * 0.035 + (((i * 17) % 7) - 3) * 0.004,
  valid: true,
}));

const DEMO_VARIABLE_TRACE: GazeSample[] = Array.from({ length: 64 }, (_, i) => ({
  x: 0.5 + Math.sin(i * 0.7) * 0.22 + (((i * 11) % 5) - 2) * 0.03,
  y: 0.5 + Math.cos(i * 0.5) * 0.18 + (((i * 13) % 5) - 2) * 0.03,
  valid: i % 8 !== 0,
}));

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function createSessionId() {
  return `OC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function formatSessionDate(value: number | null) {
  return value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum dimulai";
}

export default function ScreeningPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const user = useSyncExternalStore<SafeUser | null>(
    subscribeAuth,
    getActiveUser,
    () => null
  );

  // Tier 1: ASRS (Sesi 1: 1 page per question) & Tier 3: Physiological Context + Mode
  const [asrsStep, setAsrsStep] = useState<number>(0);
  const [asrsAnswers, setAsrsAnswers] = useState<Record<number, number>>({});
  const [asrsResult, setAsrsResult] = useState<AsrsResult | null>(null);
  const [sleepHours] = useState<SleepDuration>("6-8");
  const [caffeineRecent] = useState<boolean>(false);
  const [screenTimeHours] = useState<ScreenExposure>("2-5");
  const [testMode, setTestMode] = useState<TestMode>("quick");
  const [consent, setConsent] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(90);

  // Tier 2 Pre-flight Integrity & Environmental Protocol
  const [skipCamera, setSkipCamera] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"off" | "starting" | "ready" | "denied">("off");
  const [tabDistractionCount, setTabDistractionCount] = useState(0);

  // Practice Step (Go / No-Go verification)
  const [practiceStep, setPracticeStep] = useState<"go" | "no-go" | "done">("go");
  const advancePractice = () => {
    if (practiceStep === "go") setPracticeStep("no-go");
    else if (practiceStep === "no-go") setPracticeStep("done");
  };

  // Main CPT Running State
  const [trial, setTrial] = useState<Trial | null>(null);
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [feedback, setFeedback] = useState("Tekan hanya saat beacon hijau muncul.");

  // Results & AI State
  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoProfile, setDemoProfile] = useState<"stable" | "variable">("variable");
  const [sessionId, setSessionId] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [actualDurationSec, setActualDurationSec] = useState(360);

  // Trailing Eyes Smooth Pursuit State
  const [trailingSamples, setTrailingSamples] = useState<TrailingSample[]>([]);
  const [trailingMetrics, setTrailingMetrics] = useState<TrailingMetrics | null>(null);
  const [trailingSecondsLeft, setTrailingSecondsLeft] = useState(10);
  const [trailingBallPos, setTrailingBallPos] = useState({ x: 0.5, y: 0.5 });
  const trailingSamplesRef = useRef<TrailingSample[]>([]);
  const trailingStartedAt = useRef(0);
  const [finalGazeSamples, setFinalGazeSamples] = useState<GazeSample[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const plannedTrials = useRef<CptTrial[]>(createStructuredCptTrials("clinical"));

  // Record gaze samples during active running or trailing
  const gaze = useGazeTracking(
    videoRef,
    cameraStatus === "ready",
    phase === "running" || phase === "trailing"
  );

  const trialIndex = useRef(0);
  const startedAt = useRef(0);
  const targetDurationMs = useRef(CLINICAL_DURATION_MS);
  const showTrialRef = useRef<() => void>(() => undefined);
  const endSessionRef = useRef<() => void>(() => undefined);
  const startTestRef = useRef<() => void>(() => undefined);
  const trialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialsRef = useRef<Trial[]>([]);
  const activeTrialRef = useRef<Trial | null>(null);

  const subjectContext: SubjectContext = useMemo(
    () => ({
      sleepHours,
      caffeineRecent,
      screenTimeHours,
      timeOfDay: getDefaultTimeOfDay(),
      testMode,
    }),
    [sleepHours, caffeineRecent, screenTimeHours, testMode]
  );

  const clearTimers = useCallback(() => {
    if (trialTimer.current) clearTimeout(trialTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (endTimer.current) clearTimeout(endTimer.current);
    if (clockTimer.current) clearInterval(clockTimer.current);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("off");
  }, []);

  const enableCamera = async () => {
    setCameraStatus("starting");
    setSkipCamera(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraStatus("ready");
    } catch {
      setCameraStatus("denied");
    }
  };

  useEffect(() => {
    if (cameraStatus !== "ready" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => setCameraStatus("denied"));
  }, [cameraStatus, phase]);

  // Track distractions on tab-switch cleanly without locking the screen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === "running") {
        setTabDistractionCount((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase]);

  // Compute per-trial GDI from gaze samples and trial events
  const allGazeSamples = useMemo(() => {
    const samples = gaze.getAllSamples();
    return samples.length > 0
      ? (samples as Array<{ x: number; y: number; valid: boolean; recordedAt?: number }>)
      : ((gaze.trace as Array<{ x: number; y: number; valid: boolean; recordedAt?: number }>) ?? []);
  }, [gaze]);

  const trialGdis = useMemo(
    () => calculateTrialGdis(trials, allGazeSamples),
    [trials, allGazeSamples]
  );
  const gdiSummary = useMemo(() => summarizeGdiResults(trialGdis), [trialGdis]);

  const requestAnalysisWith = useCallback(
    async (
      targetEvents: Trial[],
      targetAsrs: AsrsResult | null,
      demoFlag: boolean,
      durationSec: number,
      tabInterruptionsCount: number,
      explicitGdi?: { meanGdi: number | null; maxGdi: number | null; minGdi: number | null; trialsWithData: number },
      explicitTrailing?: TrailingMetrics | null
    ) => {
      setAnalysisLoading(true);
      setAnalysisError(false);
      const m = calculateCptMetrics(targetEvents);
      const cStats = calculateClinicalStats(targetEvents);
      const blocks = calculateAttentionBlocks(targetEvents);
      const activeGdi = explicitGdi ?? gdiSummary;
      const activeTrailing = explicitTrailing ?? trailingMetrics;

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_version: "2.1",
            test_mode: demoFlag ? "synthetic" : subjectContext.testMode,
            duration_seconds: Math.max(1, durationSec),
            tab_interruptions: demoFlag ? 0 : tabInterruptionsCount,
            subject_context: demoFlag ? undefined : subjectContext,
            asrs: targetAsrs
              ? {
                  total_score: targetAsrs.totalScore,
                  significant_items: targetAsrs.significantCount,
                  is_significant: targetAsrs.isSignificant,
                }
              : undefined,
            cpt: {
              go_trials: m.goTrials,
              no_go_trials: m.noGoTrials,
              hit_rate: m.hitRate,
              omission_rate: m.omissionRate,
              commission_rate: m.commissionRate,
              median_rt_ms: m.medianReactionTimeMs,
              rt_variability_ms: m.reactionTimeVariabilityMs,
              d_prime: cStats.dPrime,
              anticipatory_responses: cStats.anticipatoryResponses,
              attention_lapses: cStats.attentionLapses,
              fatigue_slope: cStats.fatigueSlope,
              rt_slope_ms_per_block: cStats.rtSlopeMsPerBlock,
            },
            blocks: blocks.map((b) => ({
              label: b.label,
              phase: b.blockPhase,
              hit_rate: b.hitRate,
              commission_rate: b.commissionRate,
              median_rt_ms: b.medianRtMs,
            })),
            gaze: {
              status: demoFlag ? "unavailable" : gaze.quality.status,
              data_coverage: demoFlag ? 0 : gaze.quality.coverage,
              relative_dispersion: demoFlag ? 0 : gaze.quality.relativeDispersion,
              out_of_bounds_rate: demoFlag ? 0 : gaze.outOfBoundsRate,
              mean_gdi: demoFlag ? 0 : (activeGdi.meanGdi ?? 0),
              max_gdi: demoFlag ? 0 : (activeGdi.maxGdi ?? 0),
              trials_with_gaze_data: demoFlag ? 0 : activeGdi.trialsWithData,
            },
            trailing: activeTrailing
              ? {
                  accuracy_percent: activeTrailing.accuracyPercent,
                  mean_deviation: activeTrailing.meanDeviation,
                  intrusive_saccades: activeTrailing.intrusiveSaccades,
                  status: activeTrailing.statusLabel,
                }
              : undefined,
            ex_gaussian: demoFlag ? null : {
              mu_ms: m.exGaussian.mu,
              sigma_ms: m.exGaussian.sigma,
              tau_ms: m.exGaussian.tau,
            },
          }),
        });
        if (response.ok) {
          setAnalysis(await response.json());
        } else {
          setAnalysisError(true);
        }
      } catch {
        setAnalysisError(true);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [subjectContext, gaze.quality, gaze.outOfBoundsRate, gdiSummary, trailingMetrics]
  );

  const startTrailingStage = useCallback(() => {
    clearTimers();
    const active = activeTrialRef.current;
    if (active && !active.response) {
      trialsRef.current = [...trialsRef.current, { ...active, response: classifyResponse(active.kind, false) }];
    }
    const finalTrials = trialsRef.current;
    setTrials(finalTrials);
    setTrial(null);
    setStimulusVisible(false);

    setPhase("trailing");
    setTrailingSecondsLeft(10);
    trailingSamplesRef.current = [];
    trailingStartedAt.current = performance.now();
  }, [clearTimers]);

  const completeAllTesting = useCallback(() => {
    clearTimers();
    stopCamera();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    const finalSamples = trailingSamplesRef.current;
    setTrailingSamples(finalSamples);
    const computedTrailing = calculateTrailingMetrics(finalSamples);
    setTrailingMetrics(computedTrailing);

    const finalTrials = trialsRef.current;
    const finalMetrics = calculateCptMetrics(finalTrials);
    const finalStats = calculateClinicalStats(finalTrials);
    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - startedAt.current) / 1000)
    );

    setTrials(finalTrials);
    setTrial(null);
    setStimulusVisible(false);
    setActualDurationSec(elapsedSec);

    const allSamples = gaze.getAllSamples();
    setFinalGazeSamples(allSamples);
    const finalTrialGdis = calculateTrialGdis(finalTrials, allSamples);
    const finalGdiSummary = summarizeGdiResults(finalTrialGdis);

    setPhase("results");

    const activeUsr = getActiveUser();
    if (activeUsr && !isDemo) {
      const exportPayload = buildSessionExport(sessionId, false, finalMetrics, gaze.quality, asrsResult, {
        clinicalStats: finalStats,
        subjectContext,
        durationSeconds: elapsedSec,
        tabInterruptions: tabDistractionCount,
        outOfBoundsRate: gaze.outOfBoundsRate,
        gdiSummary: finalGdiSummary,
        trailing: computedTrailing
          ? {
              accuracy_percent: computedTrailing.accuracyPercent,
              mean_deviation: computedTrailing.meanDeviation,
              intrusive_saccades: computedTrailing.intrusiveSaccades,
              status: computedTrailing.statusLabel,
            }
          : undefined,
      });
      persistSessionToStorage({
        sessionId: sessionId || "OC-LOCAL",
        userId: activeUsr.id,
        date: Date.now(),
        durationSeconds: elapsedSec,
        testMode: subjectContext.testMode,
        asrsTotalScore: asrsResult?.totalScore ?? 0,
        asrsSignificant: asrsResult?.isSignificant ?? false,
        medianRtMs: finalMetrics.medianReactionTimeMs,
        hitRate: finalMetrics.hitRate,
        omissions: finalMetrics.omissions,
        commissions: finalMetrics.commissions,
        dPrime: finalStats.dPrime,
        gazeStatus: gaze.quality.status,
        exportPayload,
      });
    }

    void requestAnalysisWith(
      finalTrials,
      asrsResult,
      false,
      elapsedSec,
      tabDistractionCount,
      finalGdiSummary,
      computedTrailing
    );
  }, [
    clearTimers,
    stopCamera,
    isDemo,
    sessionId,
    asrsResult,
    gaze,
    subjectContext,
    tabDistractionCount,
    requestAnalysisWith,
  ]);

  useEffect(() => {
    endSessionRef.current = startTrailingStage;
  }, [startTrailingStage]);

  const showTrial = useCallback(() => {
    const elapsed = Date.now() - startedAt.current;
    if (elapsed >= targetDurationMs.current) {
      endSessionRef.current();
      return;
    }

    // Close previous unresponded trial cleanly
    const previous = activeTrialRef.current;
    if (previous && !previous.response) {
      const completed = { ...previous, response: classifyResponse(previous.kind, false) };
      trialsRef.current = [...trialsRef.current, completed];
      setTrials(trialsRef.current);
    }

    if (trialIndex.current >= plannedTrials.current.length) {
      endSessionRef.current();
      return;
    }

    const planned = plannedTrials.current[trialIndex.current];
    trialIndex.current += 1;
    const next: Trial = { ...planned, shownAt: performance.now() };
    activeTrialRef.current = next;
    setTrial(next);
    setStimulusVisible(true);
    setFeedback(next.kind === "go" ? "GO · tekan sekarang" : "NO-GO · tahan respons");

    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setStimulusVisible(false);
    }, 250);

    trialTimer.current = setTimeout(() => showTrialRef.current(), next.delayMs);
  }, []);

  useEffect(() => {
    showTrialRef.current = showTrial;
  }, [showTrial]);

  const startTest = useCallback(() => {
    clearTimers();
    gaze.reset();
    const duration = subjectContext.testMode === "clinical" ? CLINICAL_DURATION_MS : QUICK_DURATION_MS;
    targetDurationMs.current = duration;
    plannedTrials.current = createStructuredCptTrials(subjectContext.testMode);
    startedAt.current = Date.now();

    const newId = createSessionId();
    setSessionId(newId);
    setSessionStartedAt(Date.now());
    trialIndex.current = 0;
    trialsRef.current = [];
    activeTrialRef.current = null;
    setTabDistractionCount(0);
    setAnalysis(null);
    setAnalysisError(false);
    setTrials([]);
    setTrial(null);
    setStimulusVisible(false);
    setPhase("running");
    setFeedback("Siap… amati stimulus pada layar.");

    trialTimer.current = setTimeout(() => showTrialRef.current(), 1200);
    endTimer.current = setTimeout(() => endSessionRef.current(), duration);
    const initialSecs = Math.round(duration / 1000);
    setSecondsLeft(initialSecs);
    clockTimer.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
  }, [clearTimers, gaze, subjectContext]);

  useEffect(() => {
    startTestRef.current = startTest;
  }, [startTest]);

  const loadBenchmark = (profile: "stable" | "variable") => {
    clearTimers();
    stopCamera();
    gaze.reset();
    const structured = createStructuredCptTrials("clinical", 20261111);
    const benchmark: Trial[] = structured.map((planned, index) => {
      const shownAt = index * planned.delayMs;
      const blockIdx = planned.blockIndex ?? 0;
      const isLateBlock = blockIdx >= 3;
      const shouldRespond =
        profile === "stable"
          ? planned.kind === "go"
            ? index % 29 !== 0
            : false
          : planned.kind === "go"
          ? isLateBlock
            ? index % 3 !== 0
            : index % 8 !== 0
          : isLateBlock && index % 4 === 0;
      const baseRt = profile === "stable" ? 365 + (index % 5) * 14 : 420 + blockIdx * 28 + (index % 7) * 35;
      return {
        ...planned,
        shownAt,
        ...(shouldRespond
          ? {
              respondedAt: shownAt + (planned.kind === "go" ? baseRt : 195),
              response: classifyResponse(planned.kind, true),
            }
          : { response: classifyResponse(planned.kind, false) }),
      };
    });

    const demoAsrs: AsrsResult = {
      totalScore: profile === "stable" ? 6 : 17,
      significantCount: profile === "stable" ? 1 : 5,
      isSignificant: profile !== "stable",
      interpretationLay:
        profile === "stable"
          ? "Pengakuan harianmu berada dalam rentang wajar dan stabil."
          : "Pengakuan harianmu menunjukkan frekuensi kesulitan konsentrasi yang signifikan.",
      interpretationClinical:
        profile === "stable"
          ? "Skor ASRS v1.1 Part A menunjukkan 1/6 item positif (normal)."
          : "Skor ASRS v1.1 Part A menunjukkan 5/6 item positif (signifikan secara klinis).",
    };

    const demoTrailing = generateDemoTrailingSamples(profile);
    const demoTrailingMetrics = calculateTrailingMetrics(demoTrailing);
    setTrailingSamples(demoTrailing);
    setTrailingMetrics(demoTrailingMetrics);
    setFinalGazeSamples(profile === "stable" ? DEMO_STABLE_TRACE : DEMO_VARIABLE_TRACE);

    trialsRef.current = benchmark;
    setSessionId(`DEMO-${profile.toUpperCase()}`);
    setSessionStartedAt(null);
    setActualDurationSec(360);
    setAnalysis(null);
    setAnalysisError(false);
    setTrials(benchmark);
    setTrial(null);
    setStimulusVisible(false);
    setIsDemo(true);
    setDemoProfile(profile);
    setAsrsResult(demoAsrs);
    setPhase("results");
    void requestAnalysisWith(benchmark, demoAsrs, true, 360, 0, undefined, demoTrailingMetrics);
  };

  // Trailing Eyes Smooth Pursuit Animation Loop
  useEffect(() => {
    if (phase !== "trailing") return;
    let animId = 0;
    const duration = 10_000;
    const startT = performance.now();
    trailingStartedAt.current = startT;
    let lastSampleTime = 0;

    const tickTrailing = () => {
      const now = performance.now();
      const elapsed = now - startT;
      // 5000ms per full 2D lemniscate loop (Figure-8 / Smooth 2D Osu Orbit)
      const t = (2 * Math.PI * elapsed) / 5000;
      const ballX = 0.5 + 0.32 * Math.sin(t);
      const ballY = 0.5 + 0.20 * Math.sin(2 * t);
      setTrailingBallPos({ x: ballX, y: ballY });
      setTrailingSecondsLeft(Math.max(0, Math.ceil((duration - elapsed) / 1000)));

      if (now - lastSampleTime >= 50) {
        lastSampleTime = now;
        const currentGaze = gaze.latestSample;
        let mappedGazeX = ballX;
        let mappedGazeY = ballY;
        let isValid = false;

        if (currentGaze && currentGaze.valid) {
          isValid = true;
          mappedGazeX = Math.max(0.05, Math.min(0.95, 0.5 + (currentGaze.x - 0.5) * 2.8));
          mappedGazeY = Math.max(0.08, Math.min(0.92, 0.5 + (currentGaze.y - 0.5) * 2.5));
        }

        trailingSamplesRef.current.push({
          timeMs: Math.round(elapsed),
          targetX: Math.round(ballX * 1000) / 1000,
          targetY: Math.round(ballY * 1000) / 1000,
          gazeX: Math.round(mappedGazeX * 1000) / 1000,
          gazeY: Math.round(mappedGazeY * 1000) / 1000,
          valid: isValid,
        });
      }

      if (elapsed >= duration) {
        completeAllTesting();
        return;
      }

      animId = requestAnimationFrame(tickTrailing);
    };

    animId = requestAnimationFrame(tickTrailing);
    return () => cancelAnimationFrame(animId);
  }, [phase, gaze.latestSample, completeAllTesting]);

  const respond = useCallback(() => {
    if (phase !== "running") return;
    const active = activeTrialRef.current;
    if (!active || active.response) return;
    const response: Trial["response"] = active.kind === "go" ? "hit" : "commission";
    const completed = { ...active, respondedAt: performance.now(), response };
    activeTrialRef.current = completed;
    trialsRef.current = [...trialsRef.current, completed];
    setTrials(trialsRef.current);
    setFeedback(response === "hit" ? "Tepat" : "Terlalu cepat · tahan saat merah");
  }, [phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && phase === "running") {
        event.preventDefault();
        respond();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [respond, phase]);

  useEffect(() => () => {
    clearTimers();
    stopCamera();
  }, [clearTimers, stopCamera]);

  const metrics = useMemo(() => calculateCptMetrics(trials), [trials]);
  const clinicalStats = useMemo(() => calculateClinicalStats(trials), [trials]);
  const attentionBlocks = useMemo(() => calculateAttentionBlocks(trials), [trials]);

  const printSummary = () => window.print();

  const downloadJson = () => {
    const exportPayload = buildSessionExport(sessionId, isDemo, metrics, gaze.quality, asrsResult, {
      clinicalStats,
      subjectContext,
      durationSeconds: actualDurationSec,
      tabInterruptions: tabDistractionCount,
      outOfBoundsRate: gaze.outOfBoundsRate,
      gdiSummary,
      trailing: trailingMetrics
        ? {
            accuracy_percent: trailingMetrics.accuracyPercent,
            mean_deviation: trailingMetrics.meanDeviation,
            intrusive_saccades: trailingMetrics.intrusiveSaccades,
            status: trailingMetrics.statusLabel,
          }
        : undefined,
    });
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportPayload.session_id.toLowerCase()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const finishSesi1AndStartCpt = () => {
    const scored = scoreAsrs(asrsAnswers);
    setAsrsResult(scored);
    setIsDemo(false);
    setPhase("ready");
  };

  const currentAsrsQuestion = ASRS_QUESTIONS[asrsStep] ?? ASRS_QUESTIONS[0];
  const currentAsrsAnswered = asrsAnswers[currentAsrsQuestion.id] !== undefined;
  return (
    <main className="site-shell screening-shell">
      <nav className="nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user && <ProfileIconButton user={user} />}
          <span className="microcopy" style={{ margin: 0 }}>
            SCREENING /{" "}
            {phase === "running"
              ? "IN PROGRESS"
              : phase === "trailing"
              ? "TRAILING EYES"
              : phase === "results"
              ? "RESULTS"
              : "SETUP"}
          </span>
        </div>
      </nav>

      {/* STEP 2 (SESI 1): WHO ASRS Kuesioner Baku */}
      {phase === "questionnaire" && (
        <section className="screening-intro">
          <p className="status-line">
            <span className="status-dot" /> Kuesioner WHO ASRS v1.1
          </p>
          <div className="cpt-meta" style={{ marginTop: "14px" }}>
            <span>PERTANYAAN GEJALA 6 BULAN</span>
            <strong>
              Soal {String(asrsStep + 1).padStart(2, "0")} / {String(ASRS_QUESTIONS.length).padStart(2, "0")}
            </strong>
          </div>
          <h2 style={{ margin: "20px 0 16px", fontSize: "1.35rem", lineHeight: 1.4, color: "var(--ink)" }}>
            {currentAsrsQuestion.question}
          </h2>

          <div className="likert-scale">
            {ASRS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`likert-btn ${asrsAnswers[currentAsrsQuestion.id] === opt.value ? "selected" : ""}`}
                onClick={() => setAsrsAnswers((prev) => ({ ...prev, [currentAsrsQuestion.id]: opt.value }))}
              >
                <span className="scale-num">0{opt.value}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="hero-actions" style={{ marginTop: "24px" }}>
            {asrsStep > 0 ? (
              <button type="button" className="secondary-button" onClick={() => setAsrsStep((s) => Math.max(0, s - 1))}>
                ← Sebelumnya
              </button>
            ) : (
              <button type="button" className="secondary-button" onClick={() => setPhase("ready")}>
                Kembali ke persiapan
              </button>
            )}
            {asrsStep < ASRS_QUESTIONS.length - 1 ? (
              <button
                type="button"
                className="primary-button"
                disabled={!currentAsrsAnswered}
                onClick={() => setAsrsStep((s) => Math.min(ASRS_QUESTIONS.length - 1, s + 1))}
              >
                Soal berikutnya →
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={!currentAsrsAnswered}
                onClick={finishSesi1AndStartCpt}
              >
                Simpan &amp; Lanjut ke Tes →
              </button>
            )}
          </div>
        </section>
      )}

      {/* STEP 1: Persiapan & Setup (Bara Original Style) */}
      {phase === "ready" && (
        <section className="screening-intro">
          <p className="status-line">
            <span className="status-dot" /> Langkah 2 dari 3: Persiapan Penapisan
          </p>
          <h1>
            Satu menit untuk melihat <em>ritmemu.</em>
          </h1>
          <p className="hero-lede">
            Beacon hijau berarti <strong>Go</strong>: tekan Space atau tombol di layar. Asteroid merah berarti <strong>No-Go</strong>: jangan tekan apa pun. Ini adalah pengukuran performa tugas, bukan diagnosis.
          </p>

          <label className="consent-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              Saya memahami bahwa ini adalah screening performa, bukan diagnosis. Kamera opsional; video tidak disimpan atau dikirim.
            </span>
          </label>

          {/* Sesi 1: WHO ASRS Status Card */}
          <div className="practice-card">
            <div>
              <strong>Kuesioner Baku WHO ASRS v1.1</strong>
              <p>
                {asrsResult
                  ? `Hasil tersimpan: Skor ${asrsResult.totalScore}/24 (${asrsResult.significantCount}/6 item positif).`
                  : "6 pertanyaan validasi gejala inatensi & impulsivitas dalam 6 bulan terakhir."}
              </p>
            </div>
            <button
              type="button"
              className="camera-button"
              onClick={() => setPhase("questionnaire")}
            >
              {asrsResult ? "Ubah Jawaban" : "Isi Kuesioner"}
            </button>
          </div>

          {/* Latihan singkat (Bara Practice Step) */}
          <div className="practice-card">
            <div>
              <strong>Latihan singkat</strong>
              <p>
                {practiceStep === "go"
                  ? "Contoh 1 dari 2: saat lingkaran hijau muncul, tekan tombol latihan."
                  : practiceStep === "no-go"
                  ? "Contoh 2 dari 2: saat lingkaran merah muncul, tahan respons (jangan tekan)."
                  : "Latihan selesai. Kamu siap menjalankan sesi."}
              </p>
            </div>
            {practiceStep !== "done" ? (
              <>
                <div className={`practice-stimulus practice-${practiceStep}`} aria-hidden="true" />
                <button
                  type="button"
                  className="camera-button"
                  disabled={!consent}
                  onClick={advancePractice}
                >
                  {practiceStep === "go" ? "Tekan contoh Go" : "Saya paham No-Go"}
                </button>
              </>
            ) : (
              <span className="practice-complete">Siap ✓</span>
            )}
          </div>

          {/* Kamera box */}
          <div className="camera-box">
            <div role="status" aria-live="polite">
              <strong>Kamera opsional</strong>
              <p>
                {cameraStatus === "ready"
                  ? "Preview lokal aktif — video tidak direkam atau dikirim ke server."
                  : cameraStatus === "denied"
                  ? "Kamera tidak tersedia. Tes tetap bisa dilanjutkan tanpa kamera."
                  : "Tambahkan kamera untuk mengukur kestabilan tatapan foveal on-device."}
              </p>
            </div>
            {cameraStatus === "ready" ? (
              <video ref={videoRef} className="camera-preview" muted playsInline />
            ) : (
              <button
                type="button"
                className="camera-button"
                onClick={enableCamera}
              >
                {cameraStatus === "starting" ? "Memulai kamera…" : "Aktifkan kamera"}
              </button>
            )}
          </div>

          <div className="screening-notes">
            <span>Video tidak disimpan</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => setTestMode((m) => (m === "quick" ? "clinical" : "quick"))}
            >
              {testMode === "quick" ? "Mode Cepat (90 detik)" : "Standar (3 menit)"}
            </span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => setSkipCamera((s) => !s)}
            >
              {skipCamera ? "Tanpa kamera" : "Kamera on-device"}
            </span>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!consent || practiceStep !== "done"}
              onClick={() => {
                setIsDemo(false);
                startTest();
              }}
            >
              Mulai tes <span aria-hidden="true">→</span>
            </button>
            <span className="demo-label">Demo sintetis:</span>
            <button
              type="button"
              className="demo-link"
              disabled={!consent || practiceStep !== "done"}
              onClick={() => loadBenchmark("stable")}
            >
              Stable
            </button>
            <button
              type="button"
              className="demo-link"
              disabled={!consent || practiceStep !== "done"}
              onClick={() => loadBenchmark("variable")}
            >
              Variable
            </button>
            <Link className="text-link" href="/">
              Batalkan
            </Link>
          </div>
        </section>
      )}

      {/* PHASE 2: Active CPT Running Stage (Bara Pure Stimulus Card) */}
      {phase === "running" && (
        <section className="cpt-stage" aria-live="polite">
          {cameraStatus === "ready" && (
            <video ref={videoRef} className="camera-monitor" muted playsInline aria-hidden="true" />
          )}
          <div className="cpt-meta">
            <span>PERFORMA PERHATIAN</span>
            <strong>{secondsLeft}s</strong>
          </div>
          <div
            className={`stimulus ${
              stimulusVisible && trial
                ? trial.kind === "go"
                  ? "stimulus-go"
                  : "stimulus-stop"
                : "stimulus-idle"
            }`}
            onClick={respond}
          >
            <span>{stimulusVisible && trial ? (trial.kind === "go" ? "GO" : "NO-GO") : "+"}</span>
          </div>
          <p className="cpt-feedback">{feedback}</p>
          <button className="response-button" onClick={respond} aria-label="Tekan untuk merespons">
            TEKAN / SPACE
          </button>
          <button className="stop-session-button" onClick={startTrailingStage}>
            Akhiri sesi &amp; Lanjut
          </button>
          <p className="microcopy">Tetap nyaman. Kamu bisa berhenti kapan saja dengan menutup halaman.</p>
        </section>
      )}

      {/* PHASE 3: Trailing Eyes Stage (2D Smooth Pursuit Osu Style) */}
      {phase === "trailing" && (
        <section className="trailing-canvas" aria-live="polite">
          <div className="trailing-topbar">
            <span>TAHAP 3/4 · TRAILING EYES</span>
            <strong>{trailingSecondsLeft}s</strong>
          </div>

          <div style={{ position: "relative", width: "min(680px, 100%)", height: "320px", margin: "16px 0" }}>
            {cameraStatus === "ready" && (
              <video ref={videoRef} className="camera-pip" muted playsInline aria-hidden="true" />
            )}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              <path
                d="M 50.0 50.0 L 53.1 53.9 L 56.2 57.7 L 59.3 61.1 L 62.2 64.1 L 65.1 66.6 L 67.8 68.5 L 70.3 69.6 L 72.6 70.0 L 74.7 69.6 L 76.6 68.5 L 78.2 66.6 L 79.6 64.1 L 80.6 61.1 L 81.4 57.7 L 81.8 53.9 L 82.0 50.0 L 81.8 46.1 L 81.4 42.3 L 80.6 38.9 L 79.6 35.9 L 78.2 33.4 L 76.6 31.5 L 74.7 30.4 L 72.6 30.0 L 70.3 30.4 L 67.8 31.5 L 65.1 33.4 L 62.2 35.9 L 59.3 38.9 L 56.2 42.3 L 53.1 46.1 L 50.0 50.0 L 46.9 53.9 L 43.8 57.7 L 40.7 61.1 L 37.8 64.1 L 34.9 66.6 L 32.2 68.5 L 29.7 69.6 L 27.4 70.0 L 25.3 69.6 L 23.4 68.5 L 21.8 66.6 L 20.4 64.1 L 19.4 61.1 L 18.6 57.7 L 18.2 53.9 L 18.0 50.0 L 18.2 46.1 L 18.6 42.3 L 19.4 38.9 L 20.4 35.9 L 21.8 33.4 L 23.4 31.5 L 25.3 30.4 L 27.4 30.0 L 29.7 30.4 L 32.2 31.5 L 34.9 33.4 L 37.8 35.9 L 40.7 38.9 L 43.8 42.3 L 46.9 46.1 L 50.0 50.0 Z"
                fill="none"
                stroke="rgba(21, 63, 59, 0.22)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>
            <div
              className="trailing-target"
              style={{
                left: `${trailingBallPos.x * 100}%`,
                top: `${trailingBallPos.y * 100}%`,
              }}
            >
              <span className="osu-pulse-ring" />
            </div>
          </div>

          <p className="hero-lede" style={{ textAlign: "center", maxWidth: "480px", margin: "10px 0 20px" }}>
            Ikuti pergerakan bola hijau yang meluncur di lintasan dengan tatapan mata Anda selama 10 detik.
          </p>
          <button type="button" className="secondary-button" onClick={completeAllTesting}>
            Selesai &amp; Lihat Hasil →
          </button>
        </section>
      )}

      {/* PHASE 4: Results Dashboard (Bara Pure Paper Results) */}
      {phase === "results" && (
        <section className="results-section">
          <p className="status-line">
            <span className="status-dot" />{" "}
            {isDemo
              ? `Demo sintetis · ${demoProfile === "stable" ? "stable performance" : "variable performance"}`
              : "Sesi selesai"}
          </p>
          <h1>Ini gambaran <em>performamu.</em></h1>
          <p className="hero-lede">
            {isDemo
              ? "Contoh data sintetis untuk demonstrasi alur dashboard."
              : "Hasil ini menggambarkan responsmu selama tugas."}{" "}
            Gunakan sebagai bahan refleksi, bukan kesimpulan medis.
          </p>

          <div className="session-meta">
            <span><b>Sesi anonim</b>{sessionId || "OC-LOCAL"}</span>
            <span><b>Waktu</b>{isDemo ? "Fixture sintetis" : formatSessionDate(sessionStartedAt)}</span>
            <span><b>Konteks</b>{formatSubjectContextLabel(subjectContext)}</span>
            <span><b>Versi</b>2.1</span>
          </div>

          <div className="results-grid">
            <div>
              <span>Median reaction time</span>
              <strong>{metrics.medianReactionTimeMs ?? 0} ms</strong>
            </div>
            <div>
              <span>Go hit rate</span>
              <strong>{percent(metrics.hitRate)}</strong>
            </div>
            <div>
              <span>Omission error</span>
              <strong>{metrics.omissions}</strong>
            </div>
            <div>
              <span>Commission error</span>
              <strong>{metrics.commissions}</strong>
            </div>
            <div>
              <span>Correct rejection</span>
              <strong>{metrics.correctRejections}</strong>
            </div>
          </div>

          <div className="metric-glossary">
            <strong>Memahami metrik</strong>
            <div>
              <span><b>Hit rate</b> Go yang ditekan tepat waktu.</span>
              <span><b>Omission</b> Go yang terlewat.</span>
              <span><b>Commission</b> respons pada No-Go.</span>
              <span><b>Correct rejection</b> berhasil menahan respons pada No-Go.</span>
              <span><b>Reaction time</b> waktu dari stimulus ke respons.</span>
            </div>
          </div>

          <div className="attention-curve">
            <div className="curve-heading">
              <strong>Attention curve</strong>
              <span>per block · hit rate</span>
            </div>
            <div className="curve-bars">
              {attentionBlocks.map((block) => (
                <div className="curve-column" key={block.index}>
                  <div className="curve-track">
                    <div
                      className="curve-fill"
                      style={{ height: `${Math.max(8, Math.round(block.hitRate * 100))}%` }}
                    />
                  </div>
                  <span>{block.index + 1}</span>
                </div>
              ))}
            </div>
            <div className="curve-legend">
              <span><i className="legend-dot" /> Hit rate</span>
              <span>Eksperimental · bukan skor klinis</span>
            </div>
          </div>

          {/* Radar Bullseye Heatmap & Trailing Visualization */}
          {((!isDemo && gaze.quality.status !== "unavailable") || isDemo) && (
            <RadarGazeHeatmap
              samples={
                finalGazeSamples.length > 0
                  ? finalGazeSamples
                  : isDemo
                  ? (demoProfile === "stable" ? DEMO_STABLE_TRACE : DEMO_VARIABLE_TRACE)
                  : (allGazeSamples.length > 0 ? allGazeSamples : gaze.trace)
              }
              gdiScore={
                isDemo
                  ? demoProfile === "stable"
                    ? 0.038
                    : 0.142
                  : (gdiSummary.meanGdi ?? gaze.quality.relativeDispersion)
              }
              isDemo={isDemo}
            />
          )}

          {trailingMetrics && (
            <TrailingVisualization
              samples={trailingSamples}
              metrics={trailingMetrics}
              isDemo={isDemo}
            />
          )}

          <div className="analysis-box">
            <div className="curve-heading">
              <strong>Penjelasan hasil &amp; rujukan</strong>
              <span>guardrail aktif</span>
            </div>
            {analysis ? (
              <div>
                <p style={{ marginTop: "10px" }}>
                  <strong>{analysis.layperson_insight.stamina_headline}:</strong> {analysis.layperson_insight.stamina_description}
                </p>
                <p style={{ marginTop: "8px" }}>
                  <strong>{analysis.layperson_insight.reaction_style_headline}:</strong> {analysis.layperson_insight.reaction_style_description}
                </p>
                {analysis.ml_prediction && (
                  <p style={{ marginTop: "8px", color: "var(--deep)" }}>
                    <b>Pola Klasifikasi:</b>{" "}
                    {analysis.ml_prediction.classification === "adhd" ? "Risk Profile (ADHD-pattern)" : "Pattern (Neurotypical)"}{" "}
                    · Probabilitas: {(analysis.ml_prediction.adhd_probability * 100).toFixed(0)}% (Confidence: {(analysis.ml_prediction.confidence * 100).toFixed(0)}%)
                  </p>
                )}
                <ul style={{ marginTop: "12px" }}>
                  {analysis.layperson_insight.actionable_habits.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="demo-link"
                  onClick={() => void requestAnalysisWith(trials, asrsResult, isDemo, actualDurationSec, tabDistractionCount)}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Menyusun penjelasan…" : analysisError ? "Coba lagi" : "Buat penjelasan aman"}
                </button>
              </div>
            )}
          </div>

          <div className={`result-quality quality-${trials.length >= 20 ? "usable" : trials.length >= 8 ? "limited" : "insufficient"}`}>
            <span className="status-dot" />
            <div>
              <strong>Kualitas sesi: {trials.length >= 20 ? "usable" : "limited"}</strong>
              <p>
                Go/No-Go CPT dijalankan secara lokal di peramban. Seluruh proses landmark kamera berjalan on-device tanpa streaming video ke server.
              </p>
            </div>
          </div>

          <div className="report-method">
            <strong>Metodologi &amp; batasan</strong>
            <p>
              Continuous Performance Task mengukur kecepatan reaksi dan daya tahan atensi. Hasil ini bukan diagnosis medis mandiri dan tidak menggantikan konsultasi klinis profesional.
            </p>
            <a className="help-link" href="https://www.kemkes.go.id/" target="_blank" rel="noreferrer">
              Cari informasi layanan kesehatan ↗
            </a>
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={downloadJson}>
              Unduh data JSON
            </button>
            <button type="button" className="primary-button" onClick={printSummary}>
              Cetak / simpan PDF <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setIsDemo(false);
                setPhase("ready");
              }}
            >
              Ulangi tes <span aria-hidden="true">↻</span>
            </button>
            <Link className="text-link" href="/">
              Kembali ke beranda
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
