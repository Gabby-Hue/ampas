"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createCptTrials, calculateCptMetrics, calculateAttentionBlocks, classifyResponse, DEMO_FIXTURE, type CptEvent, type CptTrial } from "@/lib/cpt/engine";
import { useGazeTracking } from "@/lib/gaze/tracking";
import { buildSessionExport } from "@/lib/export/session";
type Phase = "ready" | "running" | "results";
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

function percent(value: number) { return `${Math.round(value * 100)}%`; }
function createSessionId() { return `OC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
function formatSessionDate(value: number | null) { return value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum dimulai"; }
function gazeReasonLabel(reason: "no-samples" | "low-coverage" | "insufficient-samples" | "ready") { return reason === "ready" ? "quality gate siap" : reason === "low-coverage" ? "coverage frame rendah" : reason === "insufficient-samples" ? "sampel valid belum cukup" : "belum ada sampel"; }
function subscribeToDevice() { return () => undefined; }
function getDeviceStatus() { return !window.isSecureContext && window.location.hostname !== "localhost" ? "Kamera perlu HTTPS" : !navigator.mediaDevices?.getUserMedia ? "Kamera tidak didukung" : "Browser siap"; }
function getServerDeviceStatus() { return "Menyiapkan browser…"; }
export default function ScreeningPage() {
  const [phase, setPhase] = useState<Phase>("ready"); const [consent, setConsent] = useState(false); const [practiceStep, setPracticeStep] = useState<"go" | "no-go" | "done">("go"); const [analysis, setAnalysis] = useState<{ summary: string; attention_pattern: string; suggestions: string[]; gaze_note?: string } | null>(null); const [analysisLoading, setAnalysisLoading] = useState(false); const [analysisError, setAnalysisError] = useState(false); const [isDemo, setIsDemo] = useState(false); const [demoProfile, setDemoProfile] = useState<"stable" | "variable">("variable"); const [sessionId, setSessionId] = useState(""); const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null); const [cameraStatus, setCameraStatus] = useState<"off" | "starting" | "ready" | "denied">("off"); const [trial, setTrial] = useState<Trial | null>(null); const [secondsLeft, setSecondsLeft] = useState(60); const [trials, setTrials] = useState<Trial[]>([]); const [feedback, setFeedback] = useState("Tekan hanya saat beacon hijau muncul."); const [stimulusVisible, setStimulusVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null); const plannedTrials = useRef<CptTrial[]>(createCptTrials(DEMO_FIXTURE)); const gaze = useGazeTracking(videoRef, cameraStatus === "ready"); const trialIndex = useRef(0); const startedAt = useRef(0); const showTrialRef = useRef<() => void>(() => undefined); const trialTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null); const trialsRef = useRef<Trial[]>([]); const activeTrialRef = useRef<Trial | null>(null); const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableCamera = async () => { if (!consent) return; setCameraStatus("starting"); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); streamRef.current = stream; setCameraStatus("ready"); } catch { setCameraStatus("denied"); } };
  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setCameraStatus("off"); }, []);
  useEffect(() => { if (cameraStatus !== "ready" || !videoRef.current || !streamRef.current) return; const video = videoRef.current; video.srcObject = streamRef.current; void video.play().catch(() => setCameraStatus("denied")); }, [cameraStatus, phase]);
  const clearTimers = useCallback(() => { if (trialTimer.current) clearTimeout(trialTimer.current); if (endTimer.current) clearTimeout(endTimer.current); if (clockTimer.current) clearInterval(clockTimer.current); if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  const showTrial = useCallback(() => { if (Date.now() - startedAt.current >= TEST_DURATION) return; const planned = plannedTrials.current[trialIndex.current % plannedTrials.current.length]; trialIndex.current += 1; const next: Trial = { ...planned, shownAt: performance.now() }; const previous = activeTrialRef.current; if (previous && !previous.response) { const completed = { ...previous, response: classifyResponse(previous.kind, false) }; trialsRef.current = [...trialsRef.current, completed]; setTrials(trialsRef.current); } activeTrialRef.current = next; setTrial(next); setStimulusVisible(true); if (flashTimer.current) clearTimeout(flashTimer.current); flashTimer.current = setTimeout(() => setStimulusVisible(false), 250); setFeedback(next.kind === "go" ? "GO · tekan sekarang" : "NO-GO · tahan respons"); trialTimer.current = setTimeout(() => showTrialRef.current(), next.delayMs); }, []);
  useEffect(() => { showTrialRef.current = showTrial; }, [showTrial]);
  const advancePractice = () => { if (practiceStep === "go") setPracticeStep("no-go"); else if (practiceStep === "no-go") setPracticeStep("done"); };
  const endSession = () => { const active = activeTrialRef.current; if (active && !active.response) trialsRef.current = [...trialsRef.current, { ...active, response: classifyResponse(active.kind, false) }]; setTrials(trialsRef.current); setTrial(null); setStimulusVisible(false); setPhase("results"); stopCamera(); clearTimers(); };
  const startTest = () => { if (!consent) return; clearTimers(); gaze.reset(); startedAt.current = Date.now(); setSessionId(createSessionId()); setSessionStartedAt(Date.now()); trialIndex.current = 0; trialsRef.current = []; activeTrialRef.current = null; setAnalysis(null); setAnalysisError(false); setTrials([]); setTrial(null); setStimulusVisible(false); setSecondsLeft(60); setPhase("running"); setFeedback("Siap…"); trialTimer.current = setTimeout(() => showTrialRef.current(), 1200); endTimer.current = setTimeout(endSession, TEST_DURATION); clockTimer.current = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((TEST_DURATION - (Date.now() - startedAt.current)) / 1000))), 250); };
  const loadBenchmark = (profile: "stable" | "variable") => {
    clearTimers(); stopCamera(); gaze.reset();
    const benchmark = plannedTrials.current.map((planned, index) => {
      const shownAt = index * planned.delayMs;
      const shouldRespond = profile === "stable" ? planned.kind === "go" : planned.kind === "go" ? index % 7 !== 0 : index % 5 === 0;
      return { ...planned, shownAt, ...(shouldRespond ? { respondedAt: shownAt + (planned.kind === "go" ? 420 + (index % 4) * 35 : 180), response: classifyResponse(planned.kind, true) } : { response: classifyResponse(planned.kind, false) }) };
    });
    trialsRef.current = benchmark; setSessionId(`DEMO-${profile.toUpperCase()}`); setSessionStartedAt(null); setAnalysis(null); setAnalysisError(false); setTrials(benchmark); setTrial(null); setIsDemo(true); setDemoProfile(profile); setPhase("results");
  };
  const respond = useCallback(() => { if (phase !== "running") return; const active = activeTrialRef.current; if (!active || active.response) return; const response: Trial["response"] = active.kind === "go" ? "hit" : "commission"; const completed = { ...active, respondedAt: performance.now(), response }; activeTrialRef.current = completed; trialsRef.current = [...trialsRef.current, completed]; setTrials(trialsRef.current); setFeedback(response === "hit" ? "Tepat" : "Terlalu cepat · tahan saat merah"); }, [phase]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); respond(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [respond]); useEffect(() => () => { clearTimers(); stopCamera(); }, [clearTimers, stopCamera]);
  const metrics = calculateCptMetrics(trials);
  const sessionQuality = trials.length >= 20 ? "usable" : trials.length >= 8 ? "limited" : "insufficient";
  const attentionBlocks = calculateAttentionBlocks(trials);
  const deviceCheck = useSyncExternalStore(subscribeToDevice, getDeviceStatus, getServerDeviceStatus);
  
  const printSummary = () => window.print();
  const downloadJson = () => { const exportPayload = buildSessionExport(sessionId, isDemo, metrics, gaze.quality); const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${exportPayload.session_id.toLowerCase()}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); };
  const requestAnalysis = useCallback(async () => {
    setAnalysisLoading(true); setAnalysisError(false);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_version: "2.0",
          duration_seconds: 60,
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
      if (response.ok) setAnalysis(await response.json());
      else setAnalysisError(true);
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalysisLoading(false);
    }
  }, [metrics, isDemo, gaze.quality]);

  return <main className="site-shell screening-shell"><nav className="nav-wrap"><Link className="brand" href="/"><span className="brand-mark">OC</span><span>OculiCare</span></Link><span className="microcopy">SCREENING / {phase === "running" ? "IN PROGRESS" : phase === "results" ? "RESULTS" : "SETUP"}</span></nav>
    {phase === "ready" && <section className="screening-intro"><p className="status-line"><span className="status-dot" /> Langkah 2 dari 3</p><h1>Satu menit untuk melihat <em>ritmemu.</em></h1><p className="hero-lede">Beacon hijau berarti <strong>Go</strong>: tekan Space atau tombol di layar. Asteroid merah berarti <strong>No-Go</strong>: jangan tekan apa pun. Ini adalah pengukuran performa tugas, bukan diagnosis.</p><label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Saya memahami bahwa ini adalah screening performa, bukan diagnosis. Kamera opsional; video tidak disimpan atau dikirim.</span></label><div className="practice-card"><div><strong>Latihan singkat</strong><p>{practiceStep === "go" ? "Contoh 1 dari 2: saat lingkaran hijau muncul, tekan tombol latihan." : practiceStep === "no-go" ? "Contoh 2 dari 2: saat lingkaran merah muncul, tahan respons." : "Latihan selesai. Kamu siap menjalankan sesi 60 detik."}</p></div>{practiceStep !== "done" ? <><div className={`practice-stimulus practice-${practiceStep}`} aria-hidden="true" /><button className="camera-button" disabled={!consent} onClick={advancePractice}>{practiceStep === "go" ? "Tekan contoh Go" : "Saya paham No-Go"}</button></> : <span className="practice-complete">Siap ✓</span>}</div><div className="camera-box"><div role="status" aria-live="polite"><strong>Kamera opsional</strong><p>{cameraStatus === "ready" ? gaze.status === "loading" ? "Preview lokal aktif — model gaze sedang dimuat." : gaze.status === "unavailable" ? "Preview lokal aktif — gaze tidak tersedia, tes tetap bisa dilanjutkan." : "Preview lokal aktif — video tidak direkam." : cameraStatus === "denied" ? "Kamera tidak tersedia. Tes tetap bisa dilanjutkan." : "Tambahkan kamera untuk mengukur kualitas gaze secara eksperimental."}</p></div>{cameraStatus === "ready" ? <video ref={videoRef} className="camera-preview" muted playsInline /> : <button className="camera-button" onClick={enableCamera}>{cameraStatus === "starting" ? "Memulai kamera…" : "Aktifkan kamera"}</button>}</div><div className="screening-notes"><span>Video tidak disimpan</span><span>60 detik</span><span>{deviceCheck}</span></div><div className="hero-actions"><button className="primary-button" disabled={!consent || practiceStep !== "done"} onClick={() => { setIsDemo(false); startTest(); }}>Mulai tes <span aria-hidden="true">→</span></button><span className="demo-label">Demo sintetis:</span><button className="demo-link" disabled={!consent || practiceStep !== "done"} onClick={() => loadBenchmark("stable")}>Stable</button><button className="demo-link" disabled={!consent || practiceStep !== "done"} onClick={() => loadBenchmark("variable")}>Variable</button><Link className="text-link" href="/">Batalkan</Link></div></section>}
    {phase === "running" && <section className="cpt-stage" aria-live="polite">{cameraStatus === "ready" && <video ref={videoRef} className="camera-monitor" muted playsInline aria-hidden="true" />}<div className="cpt-meta"><span>PERFORMA PERHATIAN</span><strong>{secondsLeft}s</strong></div><div className={`stimulus ${stimulusVisible && trial?.kind === "go" ? "stimulus-go" : stimulusVisible && trial?.kind === "no-go" ? "stimulus-stop" : "stimulus-idle"}`}><span>{stimulusVisible ? (trial?.kind === "go" ? "GO" : "NO-GO") : (trial ? "+" : "READY")}</span></div><p className="cpt-feedback">{feedback}</p><button className="response-button" onClick={respond} aria-label="Tekan untuk merespons">TEKAN / SPACE</button><button className="stop-session-button" onClick={endSession}>Akhiri sesi</button><p className="microcopy">Tetap nyaman. Kamu bisa berhenti kapan saja dengan menutup halaman.</p></section>}
    {phase === "results" && <section className="results-section"><p className="status-line"><span className="status-dot" /> {isDemo ? `Demo sintetis · ${demoProfile === "stable" ? "stable performance" : "variable performance"}` : "Sesi selesai"}</p><h1>Ini gambaran <em>performamu.</em></h1><p className="hero-lede">{isDemo ? "Contoh data sintetis untuk demonstrasi alur dashboard." : "Hasil ini menggambarkan responsmu selama tugas 60 detik."} Gunakan sebagai bahan refleksi, bukan kesimpulan medis.</p><div className="session-meta"><span><b>Sesi anonim</b>{sessionId || "OC-LOCAL"}</span><span><b>Waktu</b>{isDemo ? "Fixture sintetis" : formatSessionDate(sessionStartedAt)}</span><span><b>Versi</b>2.0</span></div><div className="results-grid"><div><span>Median reaction time</span><strong>{metrics.medianReactionTimeMs ?? 0} ms</strong></div><div><span>Go hit rate</span><strong>{percent(metrics.hitRate)}</strong></div><div><span>Omission error</span><strong>{metrics.omissions}</strong></div><div><span>Commission error</span><strong>{metrics.commissions}</strong></div><div><span>Correct rejection</span><strong>{metrics.correctRejections}</strong></div></div><div className="metric-glossary"><strong>Memahami metrik</strong><div><span><b>Hit rate</b> Go yang ditekan tepat waktu.</span><span><b>Omission</b> Go yang terlewat.</span><span><b>Commission</b> respons pada No-Go.</span><span><b>Correct rejection</b> berhasil menahan respons pada No-Go.</span><span><b>Reaction time</b> waktu dari stimulus ke respons.</span></div></div><div className="attention-curve"><div className="curve-heading"><strong>Attention curve</strong><span>per block · hit rate</span></div><div className="curve-bars">{attentionBlocks.map((block) => <div className="curve-column" key={block.index}><div className="curve-track"><div className="curve-fill" style={{ height: `${Math.max(8, Math.round(block.hitRate * 100))}%` }} /></div><span>{block.index + 1}</span></div>)}</div><div className="curve-legend"><span><i className="legend-dot" /> Hit rate</span><span>Eksperimental · bukan skor klinis</span></div></div>{((!isDemo && gaze.quality.status === "usable") || isDemo) && <div className="gaze-panel" aria-label="Visualisasi relatif kestabilan gaze"><div className="curve-heading"><strong>Perubahan posisi iris relatif{isDemo ? " (Simulasi Sintetis)" : ""}</strong><span>{isDemo ? `Demo ${demoProfile} · 48 sampel sintetis` : "48 sampel terakhir"}</span></div><div className="gaze-plot">{(isDemo ? (demoProfile === "stable" ? DEMO_STABLE_TRACE : DEMO_VARIABLE_TRACE) : gaze.trace).filter((sample) => sample.valid).map((sample, index) => <i key={`${index}-${sample.x}-${sample.y}`} style={{ left: `${Math.max(0, Math.min(1, sample.x)) * 100}%`, top: `${Math.max(0, Math.min(1, sample.y)) * 100}%` }} />)}</div><p>{isDemo ? "Data fiksasi tatapan sintetis untuk demonstrasi visual di panggung tanpa memerlukan sensor kamera aktif." : "Koordinat iris dinormalisasi terhadap sudut mata. Minimal 10 sampel valid dan coverage 50%. Tanpa kalibrasi layar, grafik ini tidak menunjukkan arah tatapan atau fokus pada target."}</p></div>}<div className="analysis-box"><div className="curve-heading"><strong>Penjelasan hasil</strong><span>guardrail aktif</span></div>{analysis ? <><p>{analysis.summary}</p><strong>{analysis.attention_pattern}</strong>{analysis.gaze_note && <p>{analysis.gaze_note}</p>}<ul>{analysis.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></> : <><button className="demo-link" onClick={requestAnalysis}>{analysisLoading ? "Menyusun penjelasan…" : analysisError ? "Coba lagi" : "Buat penjelasan aman"}</button>{analysisError && <p role="alert">Penjelasan belum tersedia. Metrik lokal tetap tersimpan di halaman ini.</p>}</>}</div><div className={`result-quality quality-${sessionQuality}`}><span className="status-dot" /><div><strong>Kualitas sesi: {sessionQuality}</strong><p>{sessionQuality === "usable" ? "Jumlah trial cukup untuk ringkasan performa tugas ini." : sessionQuality === "limited" ? "Jumlah trial terbatas. Perlakukan hasil sebagai indikasi awal dan pertimbangkan mengulang sesi." : "Data terlalu sedikit untuk diringkas. Jalankan sesi penuh agar hasil lebih bermakna."} Gaze: {isDemo ? "tidak digunakan pada demo sintetis" : gaze.status === "tracking" ? `${gaze.quality.status} · ${percent(gaze.quality.coverage)} coverage` : gaze.status === "loading" ? "model sedang dimuat" : "tidak tersedia"}. Quality gate: {isDemo ? "demo tidak memakai sensor" : gazeReasonLabel(gaze.quality.reason)}. Kamera bersifat opsional dan seluruh proses berjalan lokal.</p></div></div><div className="report-method"><strong>Metodologi & batasan</strong><p>Go/No-Go CPT selama 60 detik. Reaction time dihitung dari stimulus ke respons. Kamera dan gaze-quality bersifat opsional serta eksperimental. Hasil ini bukan diagnosis dan tidak menggantikan evaluasi profesional.</p><a className="help-link" href="https://www.kemkes.go.id/" target="_blank" rel="noreferrer">Cari informasi layanan kesehatan ↗</a></div><div className="hero-actions"><button className="secondary-button" onClick={downloadJson}>Unduh data JSON</button><button className="primary-button" onClick={printSummary}>Cetak / simpan PDF <span aria-hidden="true">→</span></button><button className="secondary-button" onClick={() => { setIsDemo(false); setPhase("ready"); }}>Ulangi tes <span aria-hidden="true">↻</span></button><Link className="text-link" href="/">Kembali ke beranda</Link></div></section>}
  </main>;
}



























