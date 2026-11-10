"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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

type Phase = "questionnaire" | "ready" | "running" | "results";
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
  const [consent, setConsent] = useState(false);
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
    if (Date.now() - startedAt.current >= TEST_DURATION) return;
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
    flashTimer.current = setTimeout(() => {
      setStimulusVisible(false);
    }, 250);

    setFeedback(next.kind === "go" ? "GO · tekan sekarang" : "NO-GO · tahan respons");
    trialTimer.current = setTimeout(() => showTrialRef.current(), next.delayMs);
  }, []);

  useEffect(() => {
    showTrialRef.current = showTrial;
  }, [showTrial]);

  const advancePractice = () => {
    if (practiceStep === "go") setPracticeStep("no-go");
    else if (practiceStep === "no-go") setPracticeStep("done");
  };

  const endSession = useCallback(() => {
    const active = activeTrialRef.current;
    if (active && !active.response) {
      trialsRef.current = [...trialsRef.current, { ...active, response: classifyResponse(active.kind, false) }];
    }
    setTrials(trialsRef.current);
    setTrial(null);
    setStimulusVisible(false);
    setPhase("results");
    stopCamera();
    clearTimers();
  }, [clearTimers, stopCamera]);

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
    setSecondsLeft(60);
    setPhase("running");
    setFeedback("Siapkan fokusmu…");
    trialTimer.current = setTimeout(() => showTrialRef.current(), 1200);
    endTimer.current = setTimeout(endSession, TEST_DURATION);
    clockTimer.current = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((TEST_DURATION - (Date.now() - startedAt.current)) / 1000)));
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

  const respond = useCallback(() => {
    if (phase !== "running") return;
    const active = activeTrialRef.current;
    if (!active || active.response) return;
    const response: Trial["response"] = active.kind === "go" ? "hit" : "commission";
    const completed = { ...active, respondedAt: performance.now(), response };
    activeTrialRef.current = completed;
    trialsRef.current = [...trialsRef.current, completed];
    setTrials(trialsRef.current);
    setFeedback(response === "hit" ? "Tepat ✓" : "Terburu-buru · tahan saat merah");
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
          test_version: "2.0",
          duration_seconds: 60,
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
  }, [asrsResult, metrics, isDemo, gaze.quality]);

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
        <span className="status-pill">
          {phase === "questionnaire"
            ? "1/3 KUESIONER KRONIS"
            : phase === "ready"
            ? "2/3 KALIBRASI & PRAKTIK"
            : phase === "running"
            ? "3/3 TES BERJALAN"
            : "RINGKASAN HASIL"}
        </span>
      </nav>

      {/* PHASE 1: WHO ASRS Questionnaire */}
      {phase === "questionnaire" && (
        <section className="screening-content">
          <div className="status-pill">
            <span className="status-dot" /> Tahap 1 dari 3: Pengenalan Gejala Harian
          </div>
          <h1>
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

      {/* PHASE 2: Ready & Practice */}
      {phase === "ready" && (
        <section className="screening-content">
          <div className="status-pill">
            <span className="status-dot" /> Tahap 2 dari 3: Persiapan & Latihan
          </div>
          <h1>
            Aturan tes refleks <em>60 detik.</em>
          </h1>
          <p className="hero-lede">
            Lingkaran hijau berkedip artinya <strong>GO</strong> (tekan tombol / Space). Lingkaran merah berkedip artinya{" "}
            <strong>NO-GO</strong> (tahan jarimu, jangan tekan).
          </p>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              margin: "18px 0",
              fontSize: "0.82rem",
              color: "var(--muted)",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--deep)" }}
            />
            <span>
              Saya memahami bahwa OculiCare adalah instrumen pengukur performa awal (termometer atensi), bukan vonis
              medis atau diagnosis ADHD.
            </span>
          </label>

          <div className="setup-card">
            <strong>Latihan Cepat (Coba Sekarang)</strong>
            <p style={{ margin: "6px 0 14px", fontSize: "0.82rem", color: "var(--muted)" }}>
              {practiceStep === "go"
                ? "Simulasi Go: Lingkaran hijau muncul sejenak lalu kembali ke tanda plus (+). Tekan tombol."
                : practiceStep === "no-go"
                ? "Simulasi No-Go: Lingkaran merah muncul. Tahan jarimu, jangan menekan."
                : "Latihan selesai! Jarimu sudah siap untuk sesi penuh."}
            </p>
            {practiceStep !== "done" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: practiceStep === "go" ? "var(--lime)" : "var(--coral)",
                  }}
                />
                <button className="secondary-button" disabled={!consent} onClick={advancePractice}>
                  {practiceStep === "go" ? "Coba Tekan Target Hijau" : "Saya Paham Target Merah Ditahan"}
                </button>
              </div>
            ) : (
              <span style={{ color: "#3f683a", fontWeight: 700, fontSize: "0.85rem" }}>Latihan Berhasil Selesai ✓</span>
            )}
          </div>

          <div className="camera-box-modern">
            <div>
              <strong>Kamera Tatapan Mata (Opsional)</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
                {cameraStatus === "ready"
                  ? "Preview lokal aktif. Model wajah berjalan di perangkat (WASM offline), tidak ada rekaman video disimpan."
                  : cameraStatus === "denied"
                  ? "Kamera tidak diizinkan. Tes tetap berjalan normal 100% tanpa kamera."
                  : `Membantu mengukur ketenangan tatapan mata saat stimulus muncul. (${deviceCheck})`}
              </p>
            </div>
            {cameraStatus === "ready" ? (
              <video ref={videoRef} className="camera-preview-modern" muted playsInline />
            ) : (
              <button className="secondary-button" onClick={enableCamera}>
                {cameraStatus === "starting" ? "Menghubungkan…" : "Aktifkan Kamera"}
              </button>
            )}
          </div>

          <div className="hero-actions" style={{ marginTop: "24px" }}>
            <button
              className="primary-button"
              disabled={!consent || practiceStep !== "done"}
              onClick={() => {
                setIsDemo(false);
                startTest();
              }}
            >
              Mulai Tes 60 Detik <span aria-hidden="true">→</span>
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
          <div className="cpt-topbar">
            <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)" }}>
              SESI TES REFLEKS AKTIF
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
              <span>{stimulusVisible ? (trial?.kind === "go" ? "GO" : "NO-GO") : trial ? "+" : "READY"}</span>
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
              onClick={endSession}
            >
              Akhiri Sesi Lebih Awal
            </button>
          </div>
        </section>
      )}

      {/* PHASE 4: Dual-Tone Results Dashboard */}
      {phase === "results" && (
        <section className="screening-content">
          <div className="results-header">
            <div className="status-pill">
              <span className="status-dot" /> {isDemo ? `Simulasi Benchmark · ${demoProfile.toUpperCase()}` : `Sesi Selesai · ${formatSessionDate(sessionStartedAt)}`}
            </div>
            <h1>
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
                    ? "Frekuensi jarimu keliru menekan target merah yang seharusnya ditahan."
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

          {/* Gaze Plot (Shown for both real usable gaze and synthetic demo) */}
          {((!isDemo && gaze.quality.status === "usable") || isDemo) && (
            <div className="gaze-panel">
              <div className="curve-heading">
                <strong>Kestabilan Tatapan Mata {isDemo ? "(Simulasi Sintetis)" : ""}</strong>
                <span>{isDemo ? "Demo 48 Titik Fiksasi" : "48 Sampel Terakhir"}</span>
              </div>
              <div className="gaze-plot">
                {(isDemo ? (demoProfile === "stable" ? DEMO_STABLE_TRACE : DEMO_VARIABLE_TRACE) : gaze.trace)
                  .filter((s) => s.valid)
                  .map((s, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${Math.max(0, Math.min(1, s.x)) * 100}%`,
                        top: `${Math.max(0, Math.min(1, s.y)) * 100}%`,
                      }}
                    />
                  ))}
              </div>
              <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "8px 0 0" }}>
                {isDemo
                  ? "Peta sebaran tatapan mata sintetis untuk keperluan peragaan panggung tanpa kamera aktif."
                  : "Makin rapat titik di tengah salib, makin tenang fiksasi matamu saat stimulus muncul."}
              </p>
            </div>
          )}

          {/* Footer Actions & Export */}
          <div className="hero-actions btn-no-print" style={{ marginTop: "28px" }}>
            <button className="primary-button" onClick={printSummary}>
              Cetak / Simpan Lembar Rujukan (PDF 1 Halaman) <span aria-hidden="true">→</span>
            </button>
            <button className="secondary-button" onClick={downloadJson}>
              Unduh Data Telemetri (.JSON)
            </button>
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
