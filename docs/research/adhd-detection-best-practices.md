# Deep Research: Best Approach untuk Deteksi ADHD via Machine Learning
# Sumber: 2024–2026 literature review (PMC, Frontiers, Springer)

---

## 1. HIERARKI AKURASI DETEKSI ADHD (TERBUKTI)

| Rank | Pendekatan | Accuracy / AUC | N sample | Catatan |
|------|-----------|---------------|----------|---------|
| **1** | **Ensemble multimodal (EEG + CPT + Questionnaire)** | **97.4%** | 78 | Chen et al. 2024 — preschoolers, wearable EEG 8-ch + K-CPT-2 + rating scale |
| **2** | **Eye-tracking + ML (5 tugas behavior)** | **90.8%** (AUC 0.965) | 216 | Liu et al. 2024 — prosaccade, antisaccade, memory-guided saccade, change detection, Stroop |
| **3** | **VR + Eye-tracking + Actigraphy + Experience Sampling** | **81%** test set | ~100+ | Wiebe et al. 2024 — ecological validity tinggi |
| **4** | **Wavelet Pupil Dynamics + SVM** | **84.3%** | 50 | Das et al. 2021 — Rojas-Líbano dataset, pupil diameter time series |
| **5** | **CPT saja + Random Forest/NN** | **87%** | 458 | Function-fitting model dengan kontrol variabel (usia, gender, waktu) |
| **6** | **CPT saja (standalone)** | **~70–76%** | >1600 | Meta-analysis 19 studi — AUC 0.70–0.80, moderate clinical utility |
| **7** | **Questionnaire/ASRS saja** | **Variable** | Various | Subjektif, recall bias, tidak cukup untuk diagnosis mandiri |
| **8** | **EEG single-modality** | **~82–90%** | Small samples | Butuh hardware khusus, kurang portable |

---

## 2. KEY INSIGHT: MULTIMODAL > SINGLE-MODALITY

### Temuan krusial dari riset terbaru:

**Ensemble Model (Chen et al. 2024) — 97.4% accuracy:**
- Modalitas tunggal terbaik: EEG = 95.0%, K-CPT-2 = 92.2%, Rating Scale = 90.9%
- Ensemble ketiga modalitas: **97.4%** (sensitivity 92.3%, specificity 90.0%)
- **Efek ukuran**: Cohen's d ≈ 0.54–0.59 pada fitur RTV dan ISI change
- Ini adalah **state-of-the-art tertinggi** yang dilaporkan untuk usia prasekolah

**Eye-tracking standalone (Liu et al. 2024) — 90.8% accuracy:**
- 216 anak (94 ADHD, 122 TD)
- 5 tugas behavior + eye tracking digital device
- 33 eye-tracking features terpilih
- ADHD group: increased saccade latency & degree, shorter fixation time
- Soft voting ensemble (ExtraTree + Random Forest) → AUC 0.965

**VR Multimodal (Wiebe et al. 2024) — 81% independent test:**
- Kombinasi: eye-tracking + actigraphy + CPT + experience sampling + EEG
- **EEG TIDAK KONTRIBUTIF** — hanya 11 fitur dari domain lain yang terpilih
- Artinya: behavioral + gaze + movement data sudah cukup, EEG redundant

**CPT meta-analysis (Arrondo et al. 2024):**
- AUC keseluruhan: 0.70–0.80 (barely acceptable)
- Omission/inattention: AUC lebih baik daripada commission/impulsivity
- **CPT standalone TIDAK cukup** untuk diagnosis individual — hanya untuk augmentasi klinis

---

## 3. BIOMARKER EYE-TRACKING PALING DISCRIMINATIVE

Dari 26 studi scoping review (Georgia Southern 2020–2025):

| Biomarker | Arah Perubahan di ADHD | Effect Size |
|-----------|------------------------|-------------|
| **Fixation Duration** | ↓ Lebih pendek | p<.001 |
| **Saccade Latency** | ↑ Lebih lambat | p<.001 |
| **Saccade Degree/Angle** | ↑ Lebih besar | p<.001 |
| **Intrusive Saccades** | ↑↑ Jauh lebih banyak | p<.001 |
| **Gaze Entropy** | ↑ Lebih acak | Moderate |
| **Pupil Diameter Variability** | ↑ Lebih fluktuatif | Moderate–Strong |
| **Microsaccadic Rate** | ↑ Lebih sering | Moderate |
| **Smooth Pursuit Gain** | ↓ Lebih buruk | Weak–Moderate |
| **Antisaccade Direction Errors** | ↑↑ Banyak error | Strong |
| **Gaze Dispersion Index (GDI)** | ↑ Lebih lebar | Strong |

**Top 3 biomarker paling kuat secara konsisten:**
1. Intrusive saccades — proxy impulsivitas motorik okular
2. Fixation duration — proxy sustained attention
3. Saccade latency — proxy executive function / response inhibition

---

## 4. PARADIGMA TASK YANG PALING BERPOTENSI

### Task terbaik per domain:

| Domain | Task Terbaik | Alasan |
|--------|-------------|--------|
| **Response Inhibition** | Antisaccade task | Mengukur ability to suppress prepotent response — deficit khas ADHD |
| **Sustained Attention** | CPT (Conners/TOVA/QbTest) | Gold standard behavioral measurement |
| **Working Memory** | Sternberg / N-back + eye tracking | Memisahkan defisit attention vs memory |
| **Visual Search** | Change detection task | Mengukur orienting & shifting attention |
| **Cognitive Flexibility** | Stroop task | Inhibitory control + cognitive flexibility |
| **Natural Viewing** | Free-viewing video + saliency mapping | Ecological validity tinggi |

### Multi-task approach > Single-task:
Yoo et al. 2024 menunjukkan bahwa **5 tugas berbeda** menghasilkan 33 fitur discriminative yang jauh lebih baik daripada satu tugas tunggal. Setiap tugas mengungkap dimensi ADHD yang berbeda (selective attention, working memory, response inhibition).

---

## 5. MODEL MACHINE LEARNING TERBAIK PER KATEGORI

| Kategori | Model Terbaik | Akurasi | Kelebihan |
|----------|--------------|---------|-----------|
| **Tabular/Clinical** | Random Forest / Extra Tree | 81–87% | Interpretabel, robust ke noise |
| **Ensemble Voting** | Soft voting (ET+RF+SVM) | 76–90% | Least biased, generalisasi bagus |
| **Deep Learning Sequence** | 1D-CNN + Pre-training | SOTA natural viewing | Memproses scanpath temporals |
| **Self-Supervised** | Bi-LSTM + Modality Importance Head | 73% | Generalisasi terbaik multi-task |
| **Function Fitting** | Random Forest + Control Variables | 87% | Mengoreksi bias level-imbalance |
| **Pupillometry** | SVM RBF (wavelet features) | 84.3% | Robust ke noise, single-modality最强 |

**Rekomendasi arsitektur optimal:**
```
Input Features → Feature Selection (RandomForest importance) 
               → Late Fusion: [Classifier_A × Classifier_B × Classifier_C]
               → Soft Voting Ensemble
               → Output: ADHD probability + confidence
```

---

## 6. REKOMENDASI UNTUK OCULICARE NEUROFOCUS

Berdasarkan riset di atas, ini rekomendasi prioritas implementasi:

### 🔴 HIGH — Sudah Ada (validate & strengthen)

| Fitur | Status | Rekomendasi |
|-------|--------|-------------|
| CPT Go/No-Go 6-block | ✅ Implemented | Pertahankan — foundation solid |
| ASRS v1.1 questionnaire | ✅ Implemented | Tambahkan skor sebagai fitur ML |
| Gaze quality monitoring | ✅ Basic | Upgrade ke fixation event detection |
| Local rule-based analysis | ✅ Implemented | Tinggalkan, ganti ML ensemble |

### 🟡 MEDIUM — Prioritas Implementasi Berikutnya

| Fitur | Rekomendasi | Effort | Impact |
|-------|-------------|--------|--------|
| **Multi-task paradigm** | Tambah 2–3 task tambahan: (1) Antisaccade (arahkan mata berlawanan stimulus), (2) Change detection (detect when stimulus changes) | Medium | **TINGGI** — setiap task menambah dimensi ADHD berbeda |
| **Fixation/Saccade detection** | Implement I-DT (Dispersion-Threshold) algorithm untuk segmentasi gaze menjadi fixation vs saccade events | Low-Medium | **TINGGI** — fixations shorter + intrusive saccades = top biomarkers |
| **Feature selection pipeline** | Gunakan Random Forest feature importance untuk memilih top-10 fitur discriminative dari semua biomarker | Low | **MEDIUM** — mengurangi overfitting |
| **Late fusion ensemble** | Ganti logistic regression single-model dengan soft voting ensemble: RF + XGBoost + SVM | Medium | **TINGGI** — boosting accuracy dari ~82% ke ~88%+ |
| **Cross-validation proper** | Implement 5-fold CV atau leave-one-out untuk reporting accuracy yang valid | Low | **MEDIUM** — penting untuk paper/juri |

### 🟢 LOW — Nice-to-Have (opsional competition)

| Fitur | Keterangan |
|-------|-----------|
| Pupillometry proxy | Approximate from iris landmark area variation — noisy tapi show technical depth |
| Ex-Gaussian decomposition | SUDAH DIIMPLEMENT — tau = impulsivity proxy, mu = processing speed |
| Real-time adaptation | Dynamic ISI berdasarkan performa peserta (computerized adaptive testing) |
| Sleep/circadian modeling | Incorporate time-of-day effect pada reaction time variability |

---

## 7. GAP TERBESAR: CLINICAL VALIDATION

Dari semua paper yang dibaca, **gap terbesar** di bidang ini bukan akurasi model — tapi:

1. **Small sample sizes** — median N=73 di seluruh literatur (power rendah)
2. **No external validation** — hampir semua studi internal validation saja
3. **No fairness/bias evaluation** — tidak ada evaluasi bias gender, usia, etnis
4. **No longitudinal studies** — tidak ada追踪 perubahan过时间
5. **No cross-cultural norms** — tools dikembangkan di negara tertentu, belum digeneralisasi

**Implikasi untuk OculiCare:** 
- Jangan claim "diagnosis" — gunakan "screening tool" atau "triage assessment"
- Report accuracy sebagai "preliminary validation on synthetic data"
- Sertakan formal limitations section (sudah ada di code, pertahankan)
- Clinical Benchmark Sandbox adalah strategi tepat untuk demo stage

---

## 8. SUMMARY EKSEKUTIF

> **Single modality (CPT only) = ~70–76% AUC** (marginal clinical utility)
> **Eye-tracking alone = ~90% accuracy** (strong screening potential)
> **Multimodal ensemble (CPT + Eye + Q) = ~95%+ accuracy** (approaching clinical-grade)
> **EEG + Behavioral ensemble = 97.4%** (research-grade, requires expensive hardware)

**Untuk OculiCare NeuroFocus di konteks kompetisi hackathon:**
- Fokus pada **quality of implementation** (fixation detection, multi-task design, proper ensemble)
- Validasi dengan **cross-validation** + **permutation testing**
- Paper reference: Liu et al. 2024 (JMIR), Chen et al. 2024, Walle et al. 2026 (systematic review)
