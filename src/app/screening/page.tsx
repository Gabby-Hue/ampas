"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getActiveUser, type SafeUser } from "@/lib/auth/auth";
import { persistSessionToStorage } from "@/lib/storage/history";
import {
  createCptTrials,
  calculateCptMetrics,
  calculateAttentionBlocks,
  classifyResponse,
  DEMO_FIXTURE,
  type CptEvent,
  type CptTrial,
} from "@/lib/cpt/engine";
import { ASRS_QUESTIONS, ASRS_OPTIONS, scoreAsrs, type AsrsResult } from "@/lib/cpt/asrs";
import { useGazeTracking } from "@/lib/gaze/tracking";
import { buildSessionExport } from "@/lib/export/session";
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

const TEST_DURATION = 60_000;

const DEMO_STABLE_TRACE: Array<{ x: number; y: number; valid: boolean }> = Array.from({ length: 48 }, (_, i) => ({
  x: 0.5 + Math.sin(i * 0.4) * 0.035 + ((i * 13) % 7 - 3) * 0.004,
  y: 0.5 + Math.cos(i * 0.4) * 0.035 + ((i * 17) % 7 - 3) * 0.004,
  valid: true,
}));

const DEMO_VARIABLE_TRACE: Array<{ x: number; y: number; valid: boolean }> = Array.from({ length: 48 }, (_, i) => ({
  x: 0.5 + Math.sin(i * 0.7) * 0.2 + ((i * 11) % 5 - 2) * 0.025,
  y: 0.5 + Math.cos(i * 0.5) * 0.16 + ((i * 13) % 5 - 2) * 0.025,
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

function subscribeToDevice() {
  return () => undefined;
}
function getDeviceStatus() {
  if (typeof window === "undefined") return "Menyiapkan browser…";
  return !window.isSecureContext && window.location.hostname !== "localhost"
    ? "Kamera perlu HTTPS"
    : !navigator.mediaDevices?.getUserMedia
    ? "Kamera tidak didukung"
    : "Browser siap";
}
function getServerDeviceStatus() {
  return "Menyiapkan browser…";
}

export default function ScreeningPage() {
  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [user, setUser] = useState<SafeUser | null>(null);
  const [consent, setConsent] = useState(false);

  // 4-Step Pre-Flight Integrity Checklist States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusShieldActive, setIsFocusShieldActive] = useState(false);
  const [isTestPaused, setIsTestPaused] = useState(false);
  const [tabDistractionCount, setTabDistractionCount] = useState(0);
  const [asrsAnswers, setAsrsAnswers] = useState<Record<number, number>>({ 1: 2, 2: 2, 3: 1, 4: 2, 5: 1, 6: 1 });
  const [asrsResult, setAsrsResult] = useState<AsrsResult | null>(null);

  const [practiceStep, setPracticeStep] = useState<"go" | "no-go" | "done">("go");
  const [analysisMode, setAnalysisMode] = useState<"layperson" | "clinical">("layperson");

  type ApiAnalysis = {
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

  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  const [isDemo, setIsDemo] = useState(false);
  const [demoProfile, setDemoProfile] = useState<"stable" | "variable">("variable");
  const [sessionId, setSessionId] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<"off" | "starting" | "ready" | "denied">("off");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [feedback, setFeedback] = useState("Tekan hanya saat lingkaran hijau muncul.");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const plannedTrials = useRef<CptTrial[]>(createCptTrials(DEMO_FIXTURE));
  const gaze = useGazeTracking(videoRef, cameraStatus === "ready");

  const trialIndex = useRef(0);
  const startedAt = useRef(0);
  const showTrialRef = useRef<() => void>(() => undefined);
  const trialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trialsRef = useRef<Trial[]>([]);
  const activeTrialRef = useRef<Trial | null>(null);

  const [durationMode, setDurationMode] = useState<"quick" | "clinical">("quick");
  const [trailingSamples, setTrailingSamples] = useState<TrailingSample[]>([]);
  const [trailingMetrics, setTrailingMetrics] = useState<TrailingMetrics | null>(null);
  const [trailingSecondsLeft, setTrailingSecondsLeft] = useState(10);
  const [trailingBallPos, setTrailingBallPos] = useState({ x: 0.5, y: 0.5 });
  const trailingSamplesRef = useRef<TrailingSample[]>([]);
  const trailingStartedAt = useRef(0);

  useEffect(() => {
    setUser(getActiveUser());
  }, []);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true);
      }
    } catch {
      // Fallback if browser denies
      setIsFullscreen(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Window Focus & Visibility Shield Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === "running") {
        setIsTestPaused(true);
        setTabDistractionCount((prev) => prev + 1);
      }
    };

    const handleWindowBlur = () => {
      if (phase === "running") {
        setIsTestPaused(true);
        setTabDistractionCount((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [phase]);

  const enableCamera = async () => {
    if (!consent) return;
    setCameraStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraStatus("ready");
    } catch {
      setCameraStatus("denied");
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("off");
  }, []);

  useEffect(() => {
    if (cameraStatus !== "ready" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => setCameraStatus("denied"));
  }, [cameraStatus, phase]);

  const clearTimers = useCallback(() => {
    if (trialTimer.current) clearTimeout(trialTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (endTimer.current) clearTimeout(endTimer.current);
    if (clockTimer.current) clearInterval(clockTimer.current);
  }, []);

  const showTrial = useCallback(() => {
    if (isTestPaused) return;
    const activeDuration = durationMode === "clinical" ? 300_000 : 60_000;
    if (Date.now() - startedAt.current >= activeDuration) return;
    const planned = plannedTrials.current[trialIndex.current % plannedTrials.current.length];
    trialIndex.current += 1;
    const next: Trial = { ...planned, shownAt: performance.now() };
    const previous = activeTrialRef.current;
    if (previous && !previous.response) {
      const completed = { ...previous, response: classifyResponse(previous.kind, false) };
      trialsRef.current = [...trialsRef.current, completed];
      setTrials(trialsRef.current);
    }
    activeTrialRef.current = next;
    setTrial(next);
    setStimulusVisible(true);

    if (flashTimer.current) clearTimeout(flashTimer.current);
    // Berikan durasi tampilan 500ms (0.5 detik) agar persepsi visual adil & tidak terburu-buru
    const displayDuration = next.kind === "no-go" ? 550 : 480;
    flashTimer.current = setTimeout(() => {
      setStimulusVisible(false);
    }, displayDuration);

    setFeedback(next.kind === "go" ? "HIJAU · Tekan sekarang!" : "MERAH · JANGAN PENCET! (Lepas jari)");
    trialTimer.current = setTimeout(() => showTrialRef.current(), next.delayMs);
  }, [isTestPaused, durationMode]);

  useEffect(() => {
    showTrialRef.current = showTrial;
    if (phase === "running" && !isTestPaused && !activeTrialRef.current) {
      showTrial();
    }
  }, [phase, isTestPaused, showTrial]);

  const advancePractice = () => {
    if (practiceStep === "go") setPracticeStep("no-go");
    else if (practiceStep === "no-go") setPracticeStep("done");
  };

  const startTrailingStage = useCallback(() => {
    clearTimers();
    const active = activeTrialRef.current;
    if (active && !active.response) {
      trialsRef.current = [...trialsRef.current, { ...active, response: classifyResponse(active.kind, false) }];
    }
    setTrials(trialsRef.current);
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
    const finalSamples = trailingSamplesRef.current;
    setTrailingSamples(finalSamples);
    const computedTrailingMetrics = calculateTrailingMetrics(finalSamples);
    setTrailingMetrics(computedTrailingMetrics);

    const finalTrials = trialsRef.current;
    const finalMetrics = calculateCptMetrics(finalTrials);
    setTrials(finalTrials);
    setTrial(null);
    setStimulusVisible(false);
    setPhase("results");

    // Auto-persist to history if user is logged in
    const activeUsr = getActiveUser();
    if (activeUsr && !isDemo) {
      persistSessionToStorage({
        sessionId: sessionId || "OC-LOCAL",
        userId: activeUsr.id,
        date: Date.now(),
        durationSeconds: (durationMode === "clinical" ? 300 : 60) + 10,
        asrsTotalScore: asrsResult?.totalScore ?? 0,
        asrsSignificant: asrsResult?.isSignificant ?? false,
        medianRtMs: finalMetrics.medianReactionTimeMs,
        hitRate: finalMetrics.hitRate,
        omissions: finalMetrics.omissions,
        commissions: finalMetrics.commissions,
        gazeStatus: gaze.quality.status,
      });
    }
  }, [clearTimers, stopCamera, isDemo, sessionId, asrsResult, gaze.quality.status, durationMode]);

  const endSession = startTrailingStage;

  const startTest = () => {
    if (!consent) return;
    clearTimers();
    gaze.reset();
    startedAt.current = Date.now();
    setSessionId(createSessionId());
    setSessionStartedAt(Date.now());
    trialIndex.current = 0;
    trialsRef.current = [];
    activeTrialRef.current = null;
    setAnalysis(null);
    setAnalysisError(false);
    setTrials([]);
    setTrial(null);
    setStimulusVisible(false);

    const testDurationMs = durationMode === "clinical" ? 300_000 : 60_000;
    const initialSeconds = durationMode === "clinical" ? 300 : 60;
    setSecondsLeft(initialSeconds);
    plannedTrials.current = createCptTrials({
      seed: Date.now(),
      trialCount: durationMode === "clinical" ? 220 : 42,
    });

    setPhase("running");
    setFeedback("Siapkan fokusmu…");
    trialTimer.current = setTimeout(() => showTrialRef.current(), 1200);
    endTimer.current = setTimeout(startTrailingStage, testDurationMs);
    clockTimer.current = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((testDurationMs - (Date.now() - startedAt.current)) / 1000)));
    }, 250);
  };

  const loadBenchmark = (profile: "stable" | "variable") => {
    clearTimers();
    stopCamera();
    gaze.reset();
    const benchmark = plannedTrials.current.map((planned, index) => {
      const shownAt = index * planned.delayMs;
      const shouldRespond =
        profile === "stable" ? planned.kind === "go" : planned.kind === "go" ? index % 7 !== 0 : index % 5 === 0;
      return {
        ...planned,
        shownAt,
        ...(shouldRespond
          ? {
              respondedAt: shownAt + (planned.kind === "go" ? 380 + (index % 4) * 30 : 190),
              response: classifyResponse(planned.kind, true),
            }
          : { response: classifyResponse(planned.kind, false) }),
      };
    });
    trialsRef.current = benchmark;
    setSessionId(`DEMO-${profile.toUpperCase()}`);
    setSessionStartedAt(null);
    setAnalysis(null);
    setAnalysisError(false);
    setTrials(benchmark);
    setTrial(null);
    setStimulusVisible(false);
    setIsDemo(true);
    setDemoProfile(profile);

    const demoTrailing = generateDemoTrailingSamples(profile);
    setTrailingSamples(demoTrailing);
    setTrailingMetrics(calculateTrailingMetrics(demoTrailing));

    setAsrsResult({
      totalScore: profile === "stable" ? 6 : 16,
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
    });
    setPhase("results");
  };

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
      const progress = elapsed / 4000; // 4s cycle
      const ballX = 0.5 + 0.35 * Math.sin(2 * Math.PI * progress);
      const ballY = 0.5;
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
          mappedGazeY = Math.max(0.1, Math.min(0.9, 0.5 + (currentGaze.y - 0.5) * 2.5));
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
    setFeedback(response === "hit" ? "Tepat ✓" : "Keceplosan pencet! · Jangan tekan saat merah");
  }, [phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        respond();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [respond]);

  useEffect(() => () => {
    clearTimers();
    stopCamera();
  }, [clearTimers, stopCamera]);

  const metrics = calculateCptMetrics(trials);
  const attentionBlocks = calculateAttentionBlocks(trials);
  const deviceCheck = useSyncExternalStore(subscribeToDevice, getDeviceStatus, getServerDeviceStatus);

  const printSummary = () => window.print();

  const downloadJson = () => {
    const exportPayload = buildSessionExport(sessionId, isDemo, metrics, gaze.quality, asrsResult);
    if (!isDemo) {
      exportPayload.duration_seconds = durationMode === "clinical" ? 300 : 60;
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportPayload.session_id.toLowerCase()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const requestAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(false);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_version: "2.1",
          duration_seconds: durationMode === "clinical" ? 300 : 60,
          asrs: asrsResult
            ? {
                total_score: asrsResult.totalScore,
                significant_items: asrsResult.significantCount,
                is_significant: asrsResult.isSignificant,
              }
            : undefined,
          cpt: {
            go_trials: metrics.goTrials,
            no_go_trials: metrics.noGoTrials,
            hit_rate: metrics.hitRate,
            omission_rate: metrics.omissionRate,
            commission_rate: metrics.commissionRate,
            median_rt_ms: metrics.medianReactionTimeMs,
            rt_variability_ms: metrics.reactionTimeVariabilityMs,
          },
          gaze: {
            status: isDemo ? "unavailable" : gaze.quality.status,
            data_coverage: isDemo ? 0 : gaze.quality.coverage,
            relative_dispersion: isDemo ? 0 : gaze.quality.relativeDispersion,
          },
          trailing: trailingMetrics
            ? {
                accuracy_percent: trailingMetrics.accuracyPercent,
                mean_deviation: trailingMetrics.meanDeviation,
                intrusive_saccades: trailingMetrics.intrusiveSaccades,
                status: trailingMetrics.statusLabel,
              }
            : undefined,
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
  }, [asrsResult, metrics, isDemo, gaze.quality, trailingMetrics]);

  const submitAsrsAndProceed = () => {
    const scored = scoreAsrs(asrsAnswers);
    setAsrsResult(scored);
    setPhase("ready");
  };

  return (
    <main className="site-shell screening-shell">
      <nav className="nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <Link href="/">Beranda</Link>
          <span className="status-pill">
            {phase === "questionnaire"
              ? "1/4 KUESIONER KRONIS"
              : phase === "ready"
              ? "PRE-FLIGHT INTEGRITY"
              : phase === "running"
              ? "2/4 REFLEKS CPT"
              : phase === "trailing"
              ? "3/4 TRAILING EYES"
              : "4/4 HASIL & RUJUKAN"}
          </span>
        </div>
        <div className="nav-right-actions">
          <ThemeToggle />
          {user ? (
            <Link className="text-link" href="/dashboard">
              Dashboard ({user.name.split(" ")[0]})
            </Link>
          ) : (
            <Link className="text-link" href="/login">
              Masuk
            </Link>
          )}
        </div>
      </nav>

      {/* PHASE 1: WHO ASRS Questionnaire */}
      {phase === "questionnaire" && (
        <section className="screening-content">
          <div className="status-pill">
            <span className="status-dot" /> Tahap 1 dari 4: Pengenalan Gejala Harian (WHO ASRS v1.1)
          </div>
          <h1 style={{ color: "var(--text-primary)" }}>
            Bagaimana pola fokusmu <em>6 bulan terakhir?</em>
          </h1>
          <p className="hero-lede">
            Sebelum tes refleks dimulai, jawab 6 pertanyaan baku WHO (ASRS v1.1) berikut. Ini membantu membedakan apakah
            sulit fokusmu hanya kelelahan sesaat hari ini atau kebiasaan yang berulang.
          </p>

          <div className="questionnaire-box">
            {ASRS_QUESTIONS.map((q) => (
              <div className="question-item" key={q.id}>
                <div className="question-text">
                  <span>{q.id}. </span>
                  {q.question}
                </div>
                <div className="options-grid">
                  {ASRS_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`option-btn ${(asrsAnswers[q.id] ?? 0) === opt.value ? "selected" : ""}`}
                      onClick={() => setAsrsAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hero-actions" style={{ marginTop: "24px" }}>
            <button className="primary-button" onClick={submitAsrsAndProceed}>
              Simpan & Lanjut ke Latihan Refleks <span aria-hidden="true">→</span>
            </button>
            <button className="secondary-button" onClick={() => loadBenchmark("stable")}>
              Muat Demo Cepat (Benchmark Stabil)
            </button>
          </div>
        </section>
      )}

      {/* PHASE 2: Ready & 4-Step Pre-Flight Integrity Checklist */}
      {phase === "ready" && (
        <section className="screening-content">
          <div className="status-pill">
            <span className="status-dot" /> Verifikasi Integritas: Pre-Flight Checklist
          </div>
          <h1 style={{ color: "var(--text-primary)" }}>
            Standar lingkungan tes <em>terkontrol.</em>
          </h1>
          <p className="hero-lede">
            Untuk memastikan data atensi objektif dan bebas bias gangguan luar, pastikan 4 syarat integritas di bawah ini
            terpenuhi sebelum memulai rangkaian tes (CPT & Trailing Eyes).
          </p>

          {/* SAKLAR PROTOKOL DURASI TES (DUAL-MODE) */}
          <div
            className="questionnaire-box"
            style={{
              marginBottom: "18px",
              padding: "16px 20px",
              border: "1px solid var(--surface-border)",
              borderRadius: "14px",
              background: "var(--surface-alt)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ fontSize: "0.94rem", color: "var(--text-primary)" }}>
                    Pilih Protokol Durasi Tes CPT
                  </strong>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: durationMode === "clinical" ? "rgba(0, 210, 180, 0.15)" : "rgba(148, 163, 184, 0.15)",
                      color: durationMode === "clinical" ? "var(--accent-teal)" : "var(--text-secondary)",
                      border: `1px solid ${durationMode === "clinical" ? "var(--accent-teal)" : "var(--surface-border)"}`,
                    }}
                  >
                    {durationMode === "clinical" ? "Rekomendasi Literatur Klinis" : "Khusus Demo Panggung"}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.80rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: "560px" }}>
                  {durationMode === "clinical"
                    ? "Mode Standar Klinis (5 Menit / 300s): Mengacu literatur neuropsikologi (rentang baku 4-7 menit) untuk menangkap kelelahan atensi nyata (vigilance decrement) setelah efek kebaruan awal habis."
                    : "Mode Demo Cepat (60 Detik / 60s): Ringkas dan efisien untuk peragaan panggung hackathon atau simulasi fitur instan."}
                </p>
              </div>

              {/* Saklar Segmented Control */}
              <div
                style={{
                  display: "inline-flex",
                  background: "var(--surface)",
                  padding: "4px",
                  borderRadius: "12px",
                  border: "1px solid var(--surface-border)",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: durationMode === "quick" ? "var(--accent-teal)" : "transparent",
                    color: durationMode === "quick" ? "#04251e" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setDurationMode("quick")}
                >
                  60 Detik (Demo Cepat)
                </button>
                <button
                  type="button"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: durationMode === "clinical" ? "var(--accent-teal)" : "transparent",
                    color: durationMode === "clinical" ? "#04251e" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setDurationMode("clinical")}
                >
                  5 Menit (Standar Klinis)
                </button>
              </div>
            </div>
          </div>

          {/* 4-Step Pre-Flight Checklist Card */}
          <div className="questionnaire-box" style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
              Checklist Kesiapan Pengujian
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Syarat 1: Kamera Wajah Aktif */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--surface-border-subtle)" }}>
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>1. Kamera Deteksi Fiksasi Wajah</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {cameraStatus === "ready"
                      ? `Kamera aktif (${deviceCheck}). Privasi terjaga tanpa pengunggahan video.`
                      : `Wajib diaktifkan (${deviceCheck}) untuk mengukur kestabilan okulomotor saat stimulus muncul.`}
                  </p>
                </div>
                {cameraStatus === "ready" ? (
                  <span className="badge-live" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Aktif ✓</span>
                ) : (
                  <button type="button" className="secondary-button" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={enableCamera}>
                    {cameraStatus === "starting" ? "Menghubungkan…" : "Aktifkan Kamera"}
                  </button>
                )}
              </div>

              {/* Syarat 2: Layar Penuh (Fullscreen) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--surface-border-subtle)" }}>
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>2. Mode Layar Penuh (Fullscreen Lock)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Menghilangkan distraksi bilah navigasi dan toolbar peramban.
                  </p>
                </div>
                {isFullscreen ? (
                  <span className="badge-live" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Layar Penuh ✓</span>
                ) : (
                  <button type="button" className="secondary-button" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={requestFullscreen}>
                    Aktifkan Fullscreen
                  </button>
                )}
              </div>

              {/* Syarat 3: Pelindung Fokus Anti-Pindah Tab */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--surface-border-subtle)" }}>
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>3. Focus Shield (Anti-Pindah Halaman)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Sistem akan otomatis menjeda tes dan mencatat pelanggaran jika kamu berpindah tab atau meminimize layar.
                  </p>
                </div>
                <button
                  type="button"
                  className={isFocusShieldActive ? "badge-live" : "secondary-button"}
                  style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                  onClick={() => setIsFocusShieldActive(true)}
                >
                  {isFocusShieldActive ? "Shield Aktif ✓" : "Kunci Fokus Tab"}
                </button>
              </div>

              {/* Syarat 4: Kesiapan Sistem & Rekam Sesi */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>4. Latihan Stimulus Go/No-Go</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {practiceStep === "done" ? "Latihan berhasil diselesaikan." : "Selesaikan simulasi target hijau/merah di bawah."}
                  </p>
                </div>
                {practiceStep === "done" ? (
                  <span className="badge-live" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Siap ✓</span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--coral-danger)", fontFamily: "var(--font-mono)" }}>Belum Selesai</span>
                )}
              </div>
            </div>
          </div>

          <div className="setup-card">
            <strong>Latihan Cepat Respon Motorik (Aturan Lampu)</strong>
            <p style={{ margin: "6px 0 14px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {practiceStep === "go"
                ? "Simulasi Hijau (Go): Lingkaran hijau menyala sejenak lalu kembali ke (+). Segera tekan tombol secepatnya."
                : practiceStep === "no-go"
                ? "Simulasi Merah (Stop): Lingkaran merah menyala sejenak. JANGAN DITEKAN! Lepas jarimu dan biarkan merahnya lewat."
                : "Latihan selesai! Refleks motorikmu sudah paham kapan harus memencet dan kapan harus melepaskan jari."}
            </p>
            {practiceStep !== "done" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: practiceStep === "go" ? "var(--accent-teal)" : "var(--coral-danger)",
                  }}
                />
                <button type="button" className="secondary-button" onClick={advancePractice}>
                  {practiceStep === "go" ? "Coba Tekan Target Hijau" : "Paham: Merah Jangan Dipencet"}
                </button>
              </div>
            ) : (
              <span style={{ color: "var(--accent-teal)", fontWeight: 700, fontSize: "0.85rem" }}>
                Kalibrasi Motorik Selesai ✓
              </span>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              margin: "20px 0",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--accent-teal)" }}
            />
            <span>
              Saya memahami bahwa OculiCare adalah instrumen pengukur performa awal (termometer atensi), bukan vonis
              medis atau diagnosis ADHD mandiri.
            </span>
          </label>

          <div className="hero-actions" style={{ marginTop: "24px" }}>
            <button
              className="primary-button"
              disabled={!consent || practiceStep !== "done" || !isFocusShieldActive || cameraStatus !== "ready"}
              onClick={() => {
                setIsDemo(false);
                startTest();
              }}
            >
              Mulai Tes Terkontrol (CPT & Trailing Eyes) <span aria-hidden="true">→</span>
            </button>
            <button className="text-link" onClick={() => setPhase("questionnaire")}>
              ← Ubah Jawaban Kuesioner
            </button>
          </div>
        </section>
      )}

      {/* PHASE 3: CPT Running Stage (Zero-Scroll Adaptive) */}
      {phase === "running" && (
        <section className="cpt-viewport" aria-live="polite">
          {/* PAUSED / TAB SWITCH WARNING MODAL */}
          {isTestPaused && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                background: "rgba(9, 11, 14, 0.92)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div className="status-pill" style={{ color: "var(--coral-danger)", borderColor: "var(--coral-danger)", marginBottom: "16px" }}>
                PERINGATAN INTEGRITAS PENGUJIAN
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 10px", color: "#ffffff" }}>
                Tes Dijeda: Terdeteksi Berpindah Halaman!
              </h2>
              <p style={{ maxWidth: "480px", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 24px" }}>
                Jendela browser kehilangan fokus. Untuk menjaga keabsahan data observasi waktu reaksi, kamu tidak boleh
                membuka tab lain selama 60 detik. Pelanggaran tercatat: {tabDistractionCount} kali.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setIsTestPaused(false);
                }}
              >
                Kembali & Lanjutkan Tes →
              </button>
            </div>
          )}

          <div className="cpt-topbar">
            <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)" }}>
              TAHAP 2/4: UJI REFLEKS (CPT HOLD & STOP)
            </span>
            <span className="cpt-timer">{secondsLeft}s</span>
          </div>

          <div className="cpt-stage-center">
            {cameraStatus === "ready" && (
              <video ref={videoRef} className="camera-pip" muted playsInline aria-hidden="true" />
            )}

            <div
              className={`stimulus-beacon ${
                stimulusVisible && trial?.kind === "go"
                  ? "beacon-go"
                  : stimulusVisible && trial?.kind === "no-go"
                  ? "beacon-stop"
                  : "beacon-idle"
              }`}
            >
              <span>{stimulusVisible ? (trial?.kind === "go" ? "GO" : "STOP") : trial ? "+" : "READY"}</span>
            </div>

            <div className="cpt-feedback-text">{feedback}</div>
          </div>

          <div className="trigger-zone-wrap">
            <button className="touch-trigger-btn" onClick={respond} aria-label="Tekan respon target hijau">
              <span>TEKAN DI SINI (SPACE / TAP)</span>
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{ height: "64px", borderRadius: "16px" }}
              onClick={startTrailingStage}
            >
              Lanjut ke Tahap 3: Trailing Eyes →
            </button>
          </div>
        </section>
      )}

      {/* PHASE 3: Trailing Eyes Stage (Smooth Pursuit) */}
      {phase === "trailing" && (
        <section className="cpt-viewport" aria-live="polite">
          <div className="cpt-topbar">
            <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-teal)" }}>
              TAHAP 3/4: TRAILING EYES (SMOOTH PURSUIT)
            </span>
            <span className="cpt-timer">{trailingSecondsLeft}s</span>
          </div>

          <div className="cpt-stage-center" style={{ position: "relative", overflow: "hidden" }}>
            {cameraStatus === "ready" && (
              <video ref={videoRef} className="camera-pip" muted playsInline aria-hidden="true" />
            )}

            {/* Target Trailing Rail Guide */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "12%",
                right: "12%",
                height: "2px",
                background: "rgba(0, 210, 180, 0.25)",
                transform: "translateY(-50%)",
              }}
            />

            {/* Moving Target Ball */}
            <div
              style={{
                position: "absolute",
                left: `${trailingBallPos.x * 100}%`,
                top: `${trailingBallPos.y * 100}%`,
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "radial-gradient(circle, #00d2b4 25%, #0891b2 85%)",
                boxShadow: "0 0 20px rgba(0, 210, 180, 0.8), 0 0 45px rgba(0, 210, 180, 0.4)",
                transform: "translate(-50%, -50%)",
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff" }} />
            </div>

            <div className="cpt-feedback-text" style={{ position: "absolute", bottom: "24px" }}>
              Tahan posisi kepala tetap diam. Ikuti bola cyan dengan tatapan mata Anda.
            </div>
          </div>

          <div className="trigger-zone-wrap">
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", padding: "8px 12px" }}>
              Kamera merekam sinkronisasi koordinat pupil mata terhadap lintasan target sinusoidal (Smooth Pursuit)...
            </div>
            <button
              type="button"
              className="secondary-button"
              style={{ height: "54px", borderRadius: "14px" }}
              onClick={completeAllTesting}
            >
              Selesai & Lihat Hasil Rujukan →
            </button>
          </div>
        </section>
      )}

      {/* PHASE 4: Dual-Tone Results Dashboard */}
      {phase === "results" && (
        <section className="screening-content">
          <div className="results-header">
            <div className="status-pill">
              <span className="status-dot" /> Tahap 4 dari 4: {isDemo ? `Simulasi Benchmark · ${demoProfile.toUpperCase()}` : `Sesi Selesai (${durationMode === "clinical" ? "5 Menit Standar Klinis" : "60s Demo Cepat"}) · ${formatSessionDate(sessionStartedAt)}`}
            </div>
            <h1 style={{ color: "var(--text-primary)" }}>
              Hasil Pengamatan <em>Ritme Fokusmu.</em>
            </h1>
            <p className="hero-lede">
              Berikut data objektif kecepatan respons dan daya tahan perhatianmu selama tugas berlangsung. (ID: {sessionId || "OC-LOCAL"})
            </p>
          </div>

          {/* DUAL COPYWRITING TABS */}
          <div className="dual-tone-tabs btn-no-print">
            <button
              type="button"
              className={`tab-btn ${analysisMode === "layperson" ? "active" : ""}`}
              onClick={() => setAnalysisMode("layperson")}
            >
              Penjelasan Untuk Saya (Awam & Praktis)
            </button>
            <button
              type="button"
              className={`tab-btn ${analysisMode === "clinical" ? "active" : ""}`}
              onClick={() => setAnalysisMode("clinical")}
            >
              Lembar Rujukan Medis (Dokter / Psikolog)
            </button>
          </div>

          {/* 3 CORE PILLARS CARD GRID */}
          <div className="results-grid-cards">
            {/* CARD 1: Stamina & Konsistensi */}
            <div className="result-card">
              <div>
                <div className="result-card-title">
                  {analysisMode === "layperson" ? "Stamina Fokus & Kecepatan" : "Psychomotor Speed (Median RT)"}
                </div>
                <div className="result-card-value">{metrics.medianReactionTimeMs ?? 0} ms</div>
                <div className="result-card-desc">
                  {analysisMode === "layperson"
                    ? "Waktu rata-rata otakmu memproses dan menggerakkan jari saat target hijau muncul."
                    : `Median latency reaksi foveal. RTV: ${metrics.reactionTimeVariabilityMs ?? 0} ms.`}
                </div>
              </div>
              <div style={{ marginTop: "16px", fontSize: "0.78rem", fontWeight: 700, color: "var(--deep)" }}>
                Ketepatan Go: {percent(metrics.hitRate)}
              </div>
            </div>

            {/* CARD 2: Gaya Gangguan */}
            <div className="result-card">
              <div>
                <div className="result-card-title">
                  {analysisMode === "layperson" ? "Pola Refleks Terburu-buru" : "Inhibitory Control (Commission)"}
                </div>
                <div className="result-card-value">{metrics.commissions} Kali</div>
                <div className="result-card-desc">
                  {analysisMode === "layperson"
                    ? "Frekuensi jarimu keliru menekan target merah yang seharusnya dilepas/didiamkan."
                    : `Commission Error Rate: ${percent(metrics.commissionRate)}. Indikator impulsivitas motorik.`}
                </div>
              </div>
              <div style={{ marginTop: "16px", fontSize: "0.78rem", fontWeight: 700, color: "var(--coral)" }}>
                Target Terlewat: {metrics.omissions} (Melamun)
              </div>
            </div>

            {/* CARD 3: Triangulasi Kronis ASRS */}
            <div className="result-card">
              <div>
                <div className="result-card-title">
                  {analysisMode === "layperson" ? "Keluhan Harian (WHO ASRS)" : "Chronic Symptom Index"}
                </div>
                <div className="result-card-value">
                  {asrsResult ? `${asrsResult.significantCount}/6` : "-"}
                </div>
                <div className="result-card-desc">
                  {analysisMode === "layperson"
                    ? asrsResult?.isSignificant
                      ? "Keluhan sulit fokus dalam 6 bulan terakhir cukup sering dirasakan."
                      : "Keluhan konsentrasi harian masih dalam batas wajar."
                    : asrsResult?.interpretationClinical}
                </div>
              </div>
              <div style={{ marginTop: "16px", fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)" }}>
                Total Skor: {asrsResult?.totalScore ?? 0}/24
              </div>
            </div>
          </div>

          {/* DUAL INSIGHT / CLINICAL REFERRAL PANEL */}
          <div className="analysis-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <strong style={{ fontSize: "0.95rem" }}>
                {analysisMode === "layperson" ? "💡 Kesimpulan & Saran Sehari-hari" : "📋 Catatan Klinis Rujukan Profesional"}
              </strong>
              <button
                type="button"
                className="secondary-button btn-no-print"
                style={{ padding: "6px 14px", fontSize: "0.75rem" }}
                onClick={requestAnalysis}
                disabled={analysisLoading}
              >
                {analysisLoading ? "Menganalisis…" : "Sinkronisasi AI Gemini"}
              </button>
            </div>

            {analysis ? (
              analysisMode === "layperson" ? (
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--deep)" }}>
                    {analysis.layperson_insight.reaction_style_headline}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
                    {analysis.layperson_insight.reaction_style_description}
                  </p>
                  <strong style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Langkah yang Bisa Kamu Coba:
                  </strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
                    {analysis.layperson_insight.actionable_habits.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <div style={{ background: "var(--surface-alt)", padding: "12px", borderRadius: "10px", marginBottom: "12px" }}>
                    <strong>Kesan Triase: </strong>
                    <span style={{ fontSize: "0.84rem", color: "var(--muted)" }}>
                      {analysis.clinical_referral.diagnostic_impression}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 8px" }}>
                    <strong>Psikometri CPT: </strong>
                    {analysis.clinical_referral.cpt_psychometric_note}
                  </p>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 12px" }}>
                    <strong>Stabilitas Okulomotor: </strong>
                    {analysis.clinical_referral.gaze_stability_note}
                  </p>
                  <strong style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Rekomendasi Lanjutan:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {analysis.clinical_referral.provisional_recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: "0.82rem" }}>
                {analysisError
                  ? "Sintesis AI eksternal sedang mengalami kendala jaringan. Analisis lokal tetap tersaji di atas."
                  : "Klik tombol di atas untuk menyusun sintesis cerdas berdasarkan kombinasi kuesioner ASRS dan data CPT."}
              </div>
            )}
          </div>

          {/* Trailing Eyes Smooth Pursuit Visualization */}
          {trailingMetrics && (
            <TrailingVisualization
              samples={trailingSamples}
              metrics={trailingMetrics}
              isDemo={isDemo}
            />
          )}

          {/* Attention Fatigue Curve */}
          <div className="attention-curve">
            <div className="curve-heading">
              <strong>Grafik Stamina Fokus (Menit ke Menit)</strong>
              <span>Keberhasilan Go per 10 Detik</span>
            </div>
            <div className="curve-bars">
              {attentionBlocks.map((b) => (
                <div className="curve-column" key={b.index}>
                  <div className="curve-track">
                    <div
                      className="curve-fill"
                      style={{ height: `${Math.max(8, Math.round(b.hitRate * 100))}%` }}
                    />
                  </div>
                  <span>B{b.index + 1}</span>
                </div>
              ))}
            </div>
            <div className="curve-legend" style={{ marginTop: "10px" }}>
              <span>Kurva menurun mengindikasikan penurunan daya tahan fokus di paruh kedua tugas.</span>
            </div>
          </div>

          {/* Radar Bullseye Thermal Heatmap (Shown for both real usable gaze and synthetic demo) */}
          {((!isDemo && gaze.quality.status === "usable") || isDemo) && (
            <RadarGazeHeatmap
              samples={isDemo ? (demoProfile === "stable" ? DEMO_STABLE_TRACE : DEMO_VARIABLE_TRACE) : gaze.trace}
              gdiScore={isDemo ? (demoProfile === "stable" ? 0.038 : 0.142) : gaze.quality.relativeDispersion}
              isDemo={isDemo}
            />
          )}

          {/* Footer Actions & Export */}
          <div className="hero-actions btn-no-print" style={{ marginTop: "28px" }}>
            <button className="primary-button" onClick={printSummary}>
              Cetak / Simpan Lembar Rujukan (PDF 1 Halaman) <span aria-hidden="true">→</span>
            </button>
            <button className="secondary-button" onClick={downloadJson}>
              Unduh Data Telemetri (.JSON)
            </button>
            {user && (
              <Link className="secondary-button" href="/dashboard">
                Lihat di Dashboard Histori
              </Link>
            )}
            <button
              className="secondary-button"
              onClick={() => {
                setIsDemo(false);
                setPhase("questionnaire");
              }}
            >
              Ulangi Tes ↻
            </button>
            <Link className="text-link" href="/">
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
