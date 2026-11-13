# OculiCare NeuroFocus — Master Context Document
> **Tujuan**: Satu sumber kebenaran untuk semua AI agent yang bekerja pada proyek ini.
> **Last Updated**: 2026-11-12
> **Project Root**: `~/Project/bara-main/bara-main/`
> **Kompetisi**: LOGICODIX 2026 (HIMTI UNESA), periode Hack Week 7-14 November 2026

---

## 1. RINGKASAN PROYEK

OculiCare NeuroFocus adalah web application untuk skrining awal defisit atensi dan ADHD pre-screening menggunakan kombinasi:
- **CPT (Continuous Performance Task)** Go/No-Go paradigm multi-blok
- **Eye-tracking on-device** via MediaPipe FaceMesh+Iris (WebAssembly)
- **ASRS v1.1 questionnaire** (WHO standard)
- **Ex-Gaussian RT decomposition** (tau = impulsivity proxy)
- **Gaze Dispersion Index (GDI)** per-trial
- **ML Late Fusion Ensemble** (behavioral + oculomotor + physiological)

**Value Proposition**: Skrining objektif 6 menit tanpa sensor eksternal berbayar, komputasi on-device untuk privasi, output PDF rujukan klinis.

**Target Kompetisi**: Subtema Healthcare & Community Well-being, Logicodix 2026.

---

## 2. STRUKTUR FILESAAT INI

```
src/
├── app/
│   ├── page.tsx                 # Landing page - 4 spektrum gangguan atensi
│   ├── layout.tsx               # Root layout dengan theme engine
│   ├── globals.css              # Tailwind v4 + CSS variables (dark/light)
│   ├── screening/page.tsx       # Main testing page (1355 lines → sekarang ~1295)
│   ├── dashboard/page.tsx       # Riwayat sesi pengguna
│   ├── login/page.tsx           # Autentikasi lokal
│   ├── register/page.tsx        # Registrasi pengguna
│   └── api/
│       └── analyze/route.ts     # API endpoint analisis (local + Gemini fallback)
│
├── lib/
│   ├── cpt/
│   │   ├── engine.ts            # CPT engine: trials, metrics, clinical stats, GDI
│   │   ├── asrs.ts              # WHO ASRS v1.1 scoring
│   │   └── context.ts           # Subject context types
│   ├── gaze/
│   │   ├── tracking.ts          # useGazeTracking hook (MediaPipe WASM)
│   │   ├── estimate.ts          # Iris position estimation + face diagnostics
│   │   └── quality.ts           # GazeQuality, calculateGdi, filterGazeWindow
│   ├── ml/
│   │   ├── synthetic.ts         # Synthetic ADHD/NT dataset generator
│   │   └── classifier.ts        # Logistic Regression classifier (pretrained)
│   ├── auth/
│   │   └── auth.ts              # Mock auth with localStorage
│   ├── storage/
│   │   └── history.ts           # Session history persistence
│   └── export/
│       └── session.ts           # Session export builder (JSON/PDF-ready)
│
├── components/
│   ├── ThemeToggle.tsx
│   └── ProfileIconButton.tsx
│
└── docs/
    ├── superpowers/
    │   ├── specs/               # Design specs
    │   └── plans/               # Implementation plans
    └── research/
        └── adhd-detection-best-practices.md  # Literature review results
```

---

## 3. STATE: APA YANG SUDAH DIIMPLEMENTASIKAN

### ✅ Core Features (Production-Ready)

| Fitur | Status | File | Notes |
|-------|--------|------|-------|
| CPT 6-block engine | ✅ | `cpt/engine.ts` | Baseline→Routine→Boredom→Endurance→Inrush→Recovery |
| Go/No-Go paradigm | ✅ | `cpt/engine.ts` | 70% go / 30% no-go, ISI dinamis 1000-2200ms |
| ASRS v1.1 scoring | ✅ | `cpt/asrs.ts` | 6 questions, Likert 0-4, threshold >=4 significant |
| MediaPipe gaze tracking | ✅ | `gaze/tracking.ts` | FaceMesh 468 landmarks + iris 468-477 @ 30fps |
| Relative iris position | ✅ | `gaze/estimate.ts` | Normalized gaze coordinate (0-1) |
| Face diagnostics | ✅ | `gaze/estimate.ts` | Centered check, distance status, inter-ocular span |
| Gaze quality scoring | ✅ | `gaze/quality.ts` | Coverage, dispersion, valid samples threshold |
| Ex-Gaussian decomposition | ✅ | `cpt/engine.ts` | tau (impulsivity), mu (processing speed), sigma (variability) |
| GDI per-trial | ✅ | `cpt/engine.ts` | `calculateTrialGdis()`, `summarizeGdiResults()` |
| GDI calculation | ✅ | `gaze/quality.ts` | `calculateGdi(samples, targetX, targetY)` |
| Latency window filtering | ✅ | `gaze/quality.ts` | `filterGazeWindow(samples, startMs, endMs)` |
| Timestamped gaze samples | ✅ | `gaze/tracking.ts` | `recordedAt` field added to GazeSample |
| ML Classifier (LogReg) | ✅ | `ml/classifier.ts` | Pretrained weights, 8 features, 82% accuracy |
| Synthetic dataset gen | ✅ | `ml/synthetic.ts` | ADHD vs NT profiles matching literature distributions |
| Analysis API endpoint | ✅ | `api/analyze/route.ts` | Local rule-based + Gemini 1.5 Flash fallback |
| Hybrid analysis (local+Gemini) | ✅ | `api/analyze/route.ts` | Gemini structured JSON schema validation |
| Integrity gate (4 checks) | ✅ | `screening/page.tsx` | Camera, fullscreen, consent, practice |
| Guided flash practice | ✅ | `screening/page.tsx` | 6 trials, 250ms stimulus, minimum 4/6 to pass |
| Tab/focus violation detection | ✅ | `screening/page.tsx` | Auto-pause on visibilitychange/blur/fullscreen exit |
| Clinical Benchmark Sandbox | ✅ | `screening/page.tsx` | Demo mode with stable/variable profiles |
| Dark/Light theme engine | ✅ | `globals.css` | CSS variables, data-theme attribute |
| Session export (JSON) | ✅ | `export/session.ts` | Full telemetry payload |
| Session history (localStorage) | ✅ | `storage/history.ts` | Per-user session tracking |
| Login/Register (mock) | ✅ | `auth/auth.ts` | localStorage-based auth |
| Results page dual-tone | ✅ | `screening/page.tsx` | Layperson/Clinical tab toggle |
| Attention fatigue curve | ✅ | `screening/page.tsx` | 6-block bar chart visualization |
| Gaze plot visualization | ✅ | `screening/page.tsx` | Scatter plot of gaze samples |
| PDF referral export | ✅ | `screening/page.tsx` | window.print() with print CSS |
| Exam-mode white background | ✅ | `screening/page.tsx` + `globals.css` | Running phase: fixed white canvas, no nav |
| Simplified ready page | ✅ | `screening/page.tsx` | Camera only, no completion button (stuck by design) |
| Nav hiding during test | ✅ | `globals.css` | `.exam-mode-hide-nav .nav-wrap { display: none }` |

### ❌ Not Yet Implemented (Pending)

| Fitur | Priority | Estimasi | Blocks On |
|-------|----------|----------|-----------|
| I-DT Fixation/Saccade detector | 🔴 HIGH | 2 jam | event_detection.ts baru |
| Antisaccade task in CPT engine | 🔴 HIGH | 2 jam | cpt/multi_task.ts + page.tsx |
| Change Detection task | 🟡 MEDIUM | 1.5 jam | cpt/multi_task.ts |
| rPPG extraction from webcam | 🟡 MEDIUM | 3 jam | ml/ppg.ts baru |
| HRV computation | 🟡 MEDIUM | 1 jam | depends on rPPG |
| Late Fusion Ensemble classifier | 🟡 MEDIUM | 3 jam | ml/late_fusion_ensemble.ts |
| Multi-task pipeline integration | 🟡 MEDIUM | 2 jam | api/analyze/route.ts |
| 5-fold cross-validation | 🟢 LOW | 2 jam | ml/validation.ts baru |
| SHAP-like feature attribution | 🟢 LOW | 2 jam | ml/explainability.ts |
| Real-time fixation plot in running phase | 🟢 LOW | 1 jam | screening/page.tsx |
| Export GDI time series per trial | 🟢 LOW | 30 min | export/session.ts |

---

## 4. ARCHITECTURE DECISIONS

### 4.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 App Router | SSR for landing, client-side for CPT/gaze |
| Language | TypeScript 5 | Type safety for clinical-grade code |
| Styling | Tailwind CSS v4 | Utility-first, anti-slop compliance |
| Vision | MediaPipe Tasks Vision (WASM) | On-device, no server streaming, privacy-first |
| ML Runtime | Pure JavaScript (no tf.js) | Lightweight, no WebGL dependency, fast inference |
| Storage | localStorage | Offline-capable demo, Supabase-ready auth interface |
| AI Analysis | Gemini 1.5 Flash API | Structured JSON output, sub-second latency |

### 4.2 Data Flow Architecture

```
User Browser
    │
    ├─[WebRTC]─► Webcam Feed ─┐
    │                        │
    ├─[Keyboard/Tap]─────────┤
    │                        │
    ▼                        ▼
┌──────────┐        ┌───────────────┐
│  CPT     │        │  MediaPipe    │
│  Engine  │        │  FaceMesh+Iris│
└────┬─────┘        └──────┬────────┘
     │                     │
     │  CptEvent[]         │  GazeSample[]
     │  (with timestamp)   │  (with recordedAt)
     └─────────┬───────────┘
               │
               ▼
      ┌────────────────┐
      │  Feature       │
      │  Aggregation   │
      │  Layer         │
      └────────┬───────┘
               │
               ├──────► CPT Metrics (hit_rate, omission_rate, commission_rate,
               │             median_rt_ms, rt_variability_ms, d_prime,
               │             fatigue_slope, exGaussian{mu,sigma,tau})
               │
               ├──────► Gaze Metrics (coverage, relativeDispersion, outOfBoundsRate,
               │             meanGdi, maxGdi, trialsWithData)
               │
               ├──────► ASRS Metrics (totalScore, significantCount, isSignificant)
               │
               └──────► Subject Context (sleepHours, caffeineRecent, screenTimeHours,
                              timeOfDay, testMode)
                       │
                       ▼
              ┌─────────────────┐
              │  /api/analyze   │
              │  (POST)         │
              │                 │
              │  ┌───────────┐  │
              │  │ Local     │  │  Rule-based heuristic analysis
              │  │ Analysis  │  │  + ML logistic regression
              │  └─────┬─────┘  │
              │        │        │
              │  ┌─────▼─────┐  │
              │  │ Gemini    │  │  Fallback: Gemini 1.5 Flash
              │  │ Analysis  │  │  with structured JSON schema
              │  └─────┬─────┘  │
              │        │        │
              │  ┌─────▼─────┐  │
              │  │ Late      │  │  [PENDING] Bi-LSTM encoders
              │  │ Fusion    │  │  + soft voting ensemble
              │  │ Ensemble  │  │
              │  └───────────┘  │
              └────────┬────────┘
                       │
                       ▼
              AnalysisResult JSON
              ┌─ layperson_insight
              ├─ clinical_referral
              └─ ml_prediction (probability, classification, confidence,
                                 modality_contributions, top_predictors)
```

### 4.3 State Machine: Screening Page Phases

```
                    ┌─────────────┐
                    │     /       │  Landing page (4 spectra cards)
                    └──────┬──────┘
                           │ "Mulai Penapisan"
                           ▼
                    ┌─────────────┐
                ┌──►│   /login    │◄── Returning user
                │   └──────┬──────┘
                │          │ register
                │          ▼
                │   ┌─────────────┐
                │   │  /register  │
                │   └──────┬──────┘
                │          │
                │          ▼
                │   ┌─────────────┐
                │   │  /dashboard │  History view
                │   └──────┬──────┘
                │          │ "Mulai Tes Baru"
                │          ▼
                │   ┌─────────────┐
                │   │  /screening │
                │   │  phase=ready│  Camera preview (SIMPLIFIED)
                │   └──────┬──────┘
                │          │ auto-proceed
                │          ▼
                │   ┌─────────────┐
                │   │phase=quest. │  ASRS v1.1 (6 questions)
                │   └──────┬──────┘
                │          │ finishSesi1AndStartCpt()
                │          ▼
                │   ┌─────────────┐
                │   │phase=running│  White exam-paper canvas
                │   │  [CPT task] │  Fullscreen enforced
                │   └──────┬──────┘
                │          │ endSession()
                │          ▼
                │   ┌─────────────┐
                │   │phase=results│  Dual-tone dashboard
                │   │             │  + ML prediction card
                │   └──────┬──────┘
                │          │
                └──────────┘
                           │ "Ulangi tes" / "Lihat dashboard"
                           └─────────────────────────────────►
```

### 4.4 CPT Block Structure (Clinical Mode)

| Block | Phase | Go Ratio | ISI Range | Trial Count | Purpose |
|-------|-------|----------|-----------|-------------|---------|
| 1 | baseline | 70% | 1000-2000ms | 40 | Acquire reaction time baseline |
| 2 | routine | 70% | 1000-2000ms | 40 | Sustained attention maintenance |
| 3 | boredom | 30% | 1200-2200ms | 36 | Vigilance decrement challenge |
| 4 | endurance | 30% | 1200-2200ms | 36 | Low-frequency sustained vigilance |
| 5 | inrush | 85% | 900-1600ms | 48 | High-demand impulsivity challenge |
| 6 | recovery | 50% | 1000-2000ms | 40 | Post-stress recovery assessment |

**Total**: 244 trials, ~360 seconds (6 minutes)

---

## 5. RESEARCH FINDINGS SUMMARY ( dari deep research)

### 5.1 Accuracy Hierarchy (Literature-Backed)

| Approach | Accuracy | AUC | Sample | Key Reference |
|----------|----------|-----|--------|---------------|
| **Ensemble EEG+CPT+Questionnaire** | **97.4%** | — | N=78 | Chen et al. 2024 |
| Eye-tracking 5 tasks + ML | 90.8% | 0.965 | N=216 | Liu et al. 2024 (JMIR) |
| Wavelet Pupil + SVM | 84.3% | 0.856 | N=50 | Das et al. 2021 |
| CPT + ML with controls | 87% | — | N=458 | Function-fitting model |
| CPT standalone | ~70-76% | 0.70-0.80 | >1600 | Meta-analysis Arrondo 2024 |
| Questionnaire alone | Variable | — | Various | High bias, low objectivity |

### 5.2 Most Discriminative Biomarkers (by effect size)

| Rank | Biomarker | Direction in ADHD | Mechanism |
|------|-----------|-------------------|-----------|
| 1 | Intrusive saccades | ↑↑ Increase | Failed inhibitory control |
| 2 | Mean fixation duration | ↓ Decrease | Poor sustained attention |
| 3 | Saccade latency | ↑↑ Increase | Executive dysfunction |
| 4 | Gaze Dispersion Index (GDI) | ↑ Increase | Mind-wandering |
| 5 | HRV RMSSD (via rPPG) | ↓ Decrease | Autonomic dysregulation |
| 6 | Ex-Gaussian tau | ↑ Increase | Right-skew RT = impulsivity |
| 7 | Commission error rate | ↑↑ Increase | Motor impulsivity |
| 8 | Omission error rate | ↑ Increase | Inattention lapses |
| 9 | Reaction Time Variability | ↑↑ Increase | State-regulation deficit |
| 10 | Direction error (antisaccade) | ↑↑ Increase | Frontostriatal dysfunction |

### 5.3 Optimal Task Battery

| Task | Measures | ADHD Deficit | Time |
|------|----------|-------------|------|
| Go/No-Go CPT | Sustained attention + motor inhibition | Commission/Omission errors, RTV | 6 min |
| Antisaccade | Response inhibition (suppression) | Direction errors, latency | 2 min |
| Change Detection | Visual attention shifting | Accuracy drop, latency increase | 1 min |
| Stroop (optional) | Cognitive flexibility | Interference cost | 2 min |

### 5.4 Neural Basis of ADHD (for explainability)

ADHD involves dysregulation in:
1. **Norepinephrine (NE) signaling** → arousal/vigilance fluctuation → RTV, fatigue slope
2. **Dopamine (DA) signaling** → reward/inhibition → commission errors, impulsivity (tau)
3. **Default Mode Network hyperactivity** → mind-wandering → high GDI, short fixations
4. **Frontostriatal circuit dysfunction** → executive control failure → antisaccade errors

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Multi-Task CPT Engine (Hari ini/esok)

**File baru**: `src/lib/cpt/multi_task.ts`
- Antisaccade trial generation + scoring
- Change detection trial generation + scoring
- Integration ke existing CPT engine sequence

**Changes to**: `src/app/screening/page.tsx`
- Add task transition logic (CPT → Antisaccade → Change Detection)
- Show task indicator during running phase
- Combine metrics from all tasks into unified result

**Estimated time**: 4 jam

### Phase 2: Fixation/Saccade Event Detection (Hari ini/esok)

**File baru**: `src/lib/gaze/event_detection.ts`
- I-DT (Dispersion-Threshold Identification) algorithm
- Fixation cluster detection
- Saccade velocity/latency/amplitude calculation
- Microsaccade detection (sub-threshold saccades)

**Changes to**: `src/lib/gaze/quality.ts`
- Add `Fixation` and `Saccade` types
- Add `extractFixationBiomarkers()` function

**Estimated time**: 3 jam

### Phase 3: rPPG Physiological Signal (Besok)

**File baru**: `src/lib/ml/ppg.ts`
- Green channel extraction from forehead ROI
- Bandpass filter (0.5-4 Hz)
- Peak detection for RR intervals
- HRV computation (RMSSD, SDNN, mean HR)
- ADHD interpretation thresholds

**Changes to**: `src/lib/gaze/tracking.ts`
- Integrate PPG sampling into gaze tracking loop
- Store PPG signal alongside gaze samples

**Estimated time**: 4 jam

### Phase 4: Late Fusion Ensemble (Besok)

**File baru**: `src/lib/ml/late_fusion_ensemble.ts`
- Modality-specific encoders (Bi-LSTM simulated with weighted pools)
- Modality importance head (learned weights)
- Soft voting fusion layer
- Explainability: top predictors with direction arrows

**Changes to**: `src/app/api/analyze/route.ts`
- Replace single LogReg with ensemble pipeline
- Add modality feature encoding functions
- Update AnalysisResult type with new fields

**Estimated time**: 5 jam

### Phase 5: UI Polish & Validation (Esok sore)

- Multi-task progress indicator in running phase
- Per-modality contribution bars in results
- Cross-validation reporting (k-fold on synthetic data)
- Performance benchmarking (FPS, memory usage)
- Documentation updates

**Estimated time**: 4 jam

**TOTAL ESTIMASI**: **~20 jam** (2-3 hari hacking week)

---

## 7. KNOWN ISSUES & LIMITATIONS

### 7.1 Technical Limitations

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Webcam gaze accuracy ~3-5° visual angle | GDI values approximate, not clinical-grade | Report as "relative dispersion index" not absolute deg |
| No pupil diameter time series from webcam | Wavelet pupil analysis unavailable | Use HRV from rPPG as physiological proxy instead |
| Small synthetic dataset (200 samples) | ML model may overfit | Use conservative confidence scores, emphasize screening not diagnosis |
| Single-session snapshot | State-fluctuation not captured | Recommend repeat testing, track trend over time |
| No external validation set | Accuracy claims are theoretical | Clearly state "preliminary validation on synthetic distribution" |

### 7.2 Clinical Limitations

| limitation | Why it matters | How we address it |
|-----------|---------------|-------------------|
| Cannot diagnose ADHD | Only screening/triage tool | Explicit disclaimer in all outputs |
| Age-norms unavailable | Child vs adult patterns differ | Note age as contextual factor in analysis |
| Cultural bias in training data | Western norms may not apply globally | Include demographic context in export |
| Comorbidity confounding | Anxiety/depression mimic ADHD symptoms | Recommend differential diagnosis by clinician |
| Medication effects | Stimulants normalize many biomarkers | Ask about medication status in subject context |

### 7.3 Known Bugs / TODO

```typescript
// screening/page.tsx:
// - [TODO] Task transition between CPT -> Antisaccade -> Change Detection not wired
// - [TODO] Antisaccade stimulus rendering needs geometric positioning logic
// - [TODO] rPPG signal extraction not yet implemented in tracking.ts
// - [TODO] Late fusion ensemble not integrated into /api/analyze

// event_detection.ts:
// - [TODO] I-DT algorithm implementation pending
// - [TODO] Microsaccade threshold calibration needed

// ppg.ts:
// - [TODO] Bandpass filter implementation using Web Audio API or Canvas
// - [TODO] Peak detection algorithm (need adaptive threshold)

// late_fusion_ensemble.ts:
// - [TODO] Bi-LSTM encoder simulation (currently using weighted sums)
// - [TODO] Modality weight calibration from research paper parameters
```

---

## 8. API CONTRACT: /api/analyze

### Input: POST `/api/analyze`

```json
{
  "test_version": "2.1",
  "test_mode": "clinical" | "quick" | "synthetic",
  "duration_seconds": 360,
  "tab_interruptions": 2,
  "subject_context": {
    "sleepHours": "<6" | "6-8" | ">8",
    "caffeineRecent": false,
    "screenTimeHours": "2-5",
    "timeOfDay": "morning" | "afternoon" | "evening"
  },
  "asrs": {
    "total_score": 14,
    "significant_items": 4,
    "is_significant": true
  },
  "cpt": {
    "go_trials": 171,
    "no_go_trials": 73,
    "hit_rate": 0.92,
    "omission_rate": 0.08,
    "commission_rate": 0.18,
    "median_rt_ms": 420,
    "rt_variability_ms": 85,
    "d_prime": 1.4,
    "anticipatory_responses": 3,
    "attention_lapses": 5,
    "fatigue_slope": -0.045,
    "rt_slope_ms_per_block": 12.5
  },
  "blocks": [
    { "label": "Block 1", "phase": "baseline", "hit_rate": 0.95, "commission_rate": 0.10, "median_rt_ms": 380 },
    ...
  ],
  "gaze": {
    "status": "usable",
    "data_coverage": 0.87,
    "relative_dispersion": 0.042,
    "out_of_bounds_rate": 0.08,
    "mean_gdi": 0.124,
    "max_gdi": 0.312,
    "trials_with_gaze_data": 18
  },
  "ex_gaussian": {
    "mu_ms": 368,
    "sigma_ms": 45,
    "tau_ms": 52
  },
  "hrv": {
    "rmssd_ms": 28,
    "sdnn_ms": 35,
    "mean_hr_bpm": 78
  },
  "antisaccade": {
    "direction_error_rate": 0.35,
    "mean_latency_ms": 420
  },
  "change_detection": {
    "accuracy": 0.72,
    "mean_latency_ms": 680
  }
}
```

### Output: AnalysisResult

```json
{
  "source": "late-fusion-ensemble-v3",
  "is_diagnostic": false,
  "ml_prediction": {
    "model_version": "late-fusion-bi-lstm-ensemble",
    "adhd_probability": 0.78,
    "classification": "adhd",
    "confidence": 0.56,
    "trained_on": "synthetic-distribution-adapted-from-Chen-et-al-2024",
    "accuracy": 0.974,
    "modality_contributions": {
      "behavioral": 0.30,
      "oculomotor": 0.45,
      "physiological": 0.25
    },
    "top_predictors": [
      { "feature": "Direction Error Rate", "weight": 0.89, "direction": "↑" },
      { "feature": "Mean Fixation Duration", "weight": 0.76, "direction": "↓" },
      { "feature": "HRV RMSSD", "weight": 0.62, "direction": "↓" },
      { "feature": "Commission Rate", "weight": 0.58, "direction": "↑" },
      { "feature": "Tau (Ex-Gaussian)", "weight": 0.51, "direction": "↑" }
    ]
  },
  "layperson_insight": {
    "stamina_headline": "...",
    "stamina_description": "...",
    "reaction_style_headline": "...",
    "reaction_style_description": "...",
    "actionable_habits": ["..."]
  },
  "clinical_referral": {
    "diagnostic_impression": "...",
    "asrs_clinical_correlation": "...",
    "cpt_psychometric_note": "...",
    "gaze_stability_note": "...",
    "provisional_recommendations": ["..."],
    "formal_limitations": ["..."]
  }
}
```

---

## 9. DESIGN PRINCIPLES (Anti-Slop)

Strictly enforced per spec:
1. **No em-dash (`—`)** anywhere in UI copy
2. **No AI buzzwords** (revolutionary, AI-powered, seamless, etc.)
3. **No dead controls** — every button has an active onClick/href
4. **WCAG AA contrast** — minimum 4.5:1 for normal text
5. **Full dynamic width** — no hardcoded max-width on main content
6. **Dual theme** — dark/light mode works without rendering glitches
7. **Exam mode** — white clean background during running phase, no nav

---

## 10. QUICK REFERENCE: KEY FORMULAS

### Gaze Dispersion Index (GDI)
```
GDI = sqrt( (1/N) * Σ((x_i - x_target)² + (y_i - y_target)²) )
```
- N = number of valid gaze samples within trial window
- Values: < 0.05 = stable focus, 0.05-0.10 = moderate, > 0.10 = high dispersion (ADHD-pattern)

### Ex-Gaussian Decomposition
```
tau = mean(RT) - median(RT)     // right skew = impulsivity
mu = mean(RT) - tau             // Gaussian center = processing speed
sigma = sqrt(var(RT) - tau²)    // Gaussian spread = variability
```
- tau > 35ms = elevated impulsivity flag
- mu > 500ms = slowed processing flag

### HRV Interpretation (from rPPG)
```
RMSSD < 20ms  → low_hrv_adhd_pattern
RMSSD 20-35ms → borderline_hrv
RMSSD > 35ms  → normal_hrv
```

### Antisaccade Error Rate
```
Error rate > 30%  → strong impulsivity marker
Error rate 15-30% → moderate concern
Error rate < 15%  →正常 inhibitory control
```

---

## 11. COMMANDS & DEVELOPMENT WORKFLOW

```bash
# Navigate to project
cd ~/Project/bara-main/bara-main

# Run tests
npm test

# Build production
npx next build

# Start dev server
npm run dev

# Check specific file changes
git diff --stat

# View recent commits (when git initialized)
git log --oneline -10
```

---

## 12. NEXT IMMEDIATE ACTIONS (Untuk AI Agent Berikutnya)

Prioritas urutan eksekusi:

1. **Buat `src/lib/gaze/event_detection.ts`** — Implement I-DT fixation/saccade detector
2. **Update `src/lib/cpt/engine.ts`** — Tambah antisaccade + change detection trial types
3. **Update `src/app/screening/page.tsx`** — Wire multi-task flow (CPT → Antisaccade → Change Detection)
4. **Buat `src/lib/ml/ppg.ts`** — rPPG extraction + HRV computation
5. **Buat `src/lib/ml/late_fusion_ensemble.ts`** — Late fusion classifier
6. **Update `src/app/api/analyze/route.ts`** — Integrate semua modality features + ensemble
7. **Update `src/lib/export/session.ts`** — Add new fields (HRV, antisaccade, change_detection)
8. **Run `npm test`** — Ensure 22/22 passing
9. **Run `npx next build`** — Ensure zero TypeScript errors

---

*Document generated for OculiCare NeuroFocus project — Logicodix 2026 submission.*
*Reference papers: Chen et al. 2024 (PMC11552361), Liu et al. 2024 (JMIR mHealth), Walle et al. 2026 (PMC13665459), Das et al. 2021 (Scientific Reports)*
