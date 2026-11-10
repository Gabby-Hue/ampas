# PRODUCT REQUIREMENT DOCUMENT (PRD)
## OculiCare: NeuroFocus
### NextGen Ocular Biomarker & Gamified Continuous Performance Test for Digital Attention Deficit & ADHD Pre-Screening

- **Dokumen Versi:** 1.0.0 (Production Blueprint)
- **Status:** Approved for Architecture & Development
- **Target Kompetisi:** LOGICODIX 2026 EDITION (HIMTI UNESA)
- **Subtema Inovasi:** Healthcare & Community Well-being
- **Jalur Produk:** Web Application (Responsive Desktop & Mobile)
- **Periode Hacking Week:** 7 – 14 November 2026
- **Lokasi Berkas PDF:** `C:\Users\LENOVO\Downloads\PRD_OculiCare_NeuroFocus.pdf`

---

## 1. RINGKASAN EKSEKUTIF & LATAR BELAKANG MASALAH

### 1.1 Konteks Permasalahan
Krisis rentang atensi (*attention span*) generasi digital telah mencapai titik kritis global. Paparan stimulasi dopamin konstan dari platform media sosial berbasis video pendek (*TikTok*, *Instagram Reels*, *YouTube Shorts*) memicu kondisi neurokognitif yang dikenal sebagai **Acquired Attention Deficit**:
- **Involuntary Attention Drifts:** Ketidakmampuan mempertahankan tatapan fiksasi stabil pada satu tugas kerja/belajar.
- **Motor Impulsivity:** Refleks jari yang bergerak sebelum otak memproses instruksi secara sadar (kebiasaan *frequent swiping/tapping*).
- **Cognitive Exhaustion (Digital Brain Fog):** Anjloknya kecepatan pemrosesan informasi dan memori kerja setelah 20–30 detik menghadapi materi statis.

### 1.2 Hambatan Diagnostik Konvensional
Di Indonesia, skrining ADHD dan defisit atensi menghadapi kendala struktural yang masif:
1. **Biaya Konsultasi Tinggi:** Biaya asesmen psikologis atau psikiatris klinis berkisar antara Rp500.000 hingga Rp2.500.000 per sesi, sulit dijangkau mahasiswa dan masyarakat menengah ke bawah.
2. **Antrean Fasilitas Kesehatan:** Keterbatasan jumlah psikiater dan psikolog klinis di luar kota besar menyebabkan waktu tunggu antrean mencapai berminggu-minggu.
3. **Subjektivitas Asesmen Tradisional:** Penilaian standar saat ini didominasi oleh kuesioner ingatan (*self-report checklist* seperti ASRS v1.1) yang sangat rentan bias subjektif (*recall bias*) dan manipulasi jawaban.

### 1.3 Solusi Produk: OculiCare NeuroFocus
OculiCare: NeuroFocus mendemokratisasi asesmen atensi neurokognitif secara objektif dalam **60 detik** langsung dari peramban web modern tanpa memerlukan sensor eksternal berbayar:
- Mengintegrasikan tes neurosains baku (**Continuous Performance Task / CPT**) dengan pelacakan biomarker tatapan mata (*Ocular Biometrics*) berbasis kamera laptop atau smartphone standar.
- Memproses seluruh komputasi *computer vision* secara **on-device** (WebAssembly) demi privasi mutlak pengguna.
- Mentransformasikan telemetri biologis mentah menjadi interpretasi klinis terstruktur berbasis DSM-5 dan panduan *digital hygiene* menggunakan **Medical Intelligence (Gemini 1.5 API)**.

---

## 2. TUJUAN PRODUK & KEY PERFORMANCE INDICATORS (KPI)

### 2.1 Tujuan Produk
1. **Demokratisasi Skrining Objektif:** Menyediakan instrumen penapisan dini defisit atensi yang dapat diakses siapa saja, kapan saja, tanpa hambatan biaya atau perangkat keras tambahan.
2. **Jembatan Klinis Berbasis Data:** Menghasilkan ringkasan rujukan kuantitatif satu halaman (PDF) yang dapat dibawa pengguna saat berkonsultasi dengan profesional medis.
3. **Pemenang Mutlak Subtema Healthcare LOGICODIX 2026:** Menyajikan inovasi *deep-tech* yang berdampak sosial masif, memiliki arsitektur *software engineering* yang kokoh, dan tahan uji saat didemonstrasikan di panggung.

### 2.2 Key Performance Indicators (KPIs)
- **Zero-Friction Onboarding:** Pengguna dapat menyelesaikan seluruh alur (izin kamera, kalibrasi 5 detik, pengujian 60 detik, hingga hasil keluar) dalam total waktu < 90 detik.
- **On-Device Vision Latency:** Pelacakan iris dan pupil via MediaPipe berjalan stabil pada **>= 30 Frame Per Second (FPS)** di peramban standar tanpa menurunkan kinerja CPU klien.
- **Medical Intelligence Latency:** Sintesis payload telemetri menjadi JSON klinis terstruktur melalui Gemini 1.5 Flash API selesai dalam waktu **< 1.5 detik**.
- **Stage Reliability (Fail-Safe Metric):** 100% bebas kegagalan sensor di panggung juri melalui implementasi tersembunyi *Clinical Benchmark Sandbox*.

---

## 3. SPESIFIKASI FITUR & MODUL SISTEM

```
+---------------------------------------------------------------------------------------------------+
|                                  ARSITEKTUR END-TO-END OCULICARE                                 |
+---------------------------------------------------------------------------------------------------+
|  [Kamera Laptop / HP]                                                                             |
|          |                                                                                        |
|          v (Video Feed Lokal - WebRTC)                                                            |
|  [MediaPipe Iris (On-Device Wasm)] -----> Ekstraksi 468 Landmark Wajah & Titik Pusat Pupil (30Hz) |
|          |                                                                                        |
|          v                                                                                        |
|  [Gamified CPT Engine (60 Detik)] ------> Pengujian Go/No-Go (Latency, Hit, Miss, Commission Error)|
|          |                                                                                        |
|          v                                                                                        |
|  [Telemetry Aggregation Engine] --------> Hitung GDI, Microsaccadic Jitter, Attenuation Curve    |
|          |                                                                                        |
|          v (Payload JSON Metrik Bersih)                                                           |
|  [Gemini 1.5 API (/api/analyze)] -------> Medical Intelligence (DSM-5 Structured Output Schema)  |
|          |                                                                                        |
|          +--------------------------------------+                                                 |
|          |                                      |                                                 |
|          v                                      v                                                 |
|  [Clinical Gaze Heatmap Canvas]      [One-Click Medical PDF Export]                               |
|  [Attentional Fatigue Curve]         [Digital Hygiene Protocol Guide]                             |
+---------------------------------------------------------------------------------------------------+
```

### 3.1 Modul 1: Calibration & Ocular Tracking Engine (Client-Side)
- Menginisialisasi model `@mediapipe/face_mesh` dengan ekstensi Iris secara lokal menggunakan runtime WebAssembly / WebGL.
- Melacak titik landmark 468–472 (kontur iris dan pupil mata kiri dan kanan).
- Melakukan kalibrasi 4 titik sudut layar (*Four-Corner Fixation Calibration*) selama 5 detik untuk normalisasi matriks koordinat foveal pengguna terhadap resolusi viewport layar.
- Menghitung koordinat tatapan (*gaze coordinate*) $(x_t, y_t)$ setiap 33 milidetik.

### 3.2 Modul 2: 60-Second Gamified Continuous Performance Task (CPT)
- Mini-game neuro-atensi berbasis paradigma Conners CPT / TOVA:
  - **Target Go (70% Kemunculan):** Muncul target visual standar (*Beacon Fokus Hijau*). Pengguna wajib menekan tombol Spasi atau tap layar secepat mungkin.
  - **Target No-Go (30% Kemunculan):** Muncul target anomali/jebakan (*Asteroid Merah*). Pengguna wajib menahan respons motorik (tidak menekan tombol).
  - **Inter-Stimulus Interval (ISI) Dinamis:** Waktu jeda antar-target divariasikan secara pseudorandom antara 1.000 ms hingga 2.200 ms untuk mengukur konsentrasi murni tanpa ritme antisipatif.
- Mengukur ketahanan fokus berkelanjutan (*sustained vigilance*) selama tepat 60 detik.

### 3.3 Modul 3: Biomarker Extraction Engine
Mengonversi data sensorik mentah menjadi 4 metrik neurofisiologis:
1. **Gaze Dispersion Index (GDI):** Standar deviasi spasial sebaran tatapan mata terhadap koordinat target aktif:
   $$GDI = \sqrt{\frac{1}{N} \sum_{i=1}^{N} ((x_i - x_{target})^2 + (y_i - y_{target})^2)}$$
   - GDI Rendah (< 2.5 px normalisasi): Fokus visual stabil (Neurotipikal).
   - GDI Tinggi (> 5.0 px normalisasi): Tatapan mata melompat-lompat / melamun (*Mind-Wandering / ADHD*).
2. **Microsaccadic Jitter Rate:** Frekuensi pergeseran mikro bola mata (> 30 derajat/detik) per satuan detik saat mempertahankan fiksasi statis.
3. **Reaction Time Latency & Variance (RTV):** Waktu respons rata-rata (ms) dan standar deviasi variabilitas respons saraf.
4. **Commission & Omission Error:**
   - *Commission Error:* Kegagalan menahan diri pada target No-Go (indikator impulsivitas motorik / kebiasaan *scrolling* cepat).
   - *Omission Error:* Kelengahan menekan target Go (indikator inattention / kelengahan fokus).

### 3.4 Modul 4: Medical Intelligence Layer (Gemini 1.5 Flash API)
- Backend endpoint `/api/analyze` menerima payload metrik terukur.
- Memanfaatkan **Google Gemini 1.5 Flash API** dengan parameter `response_schema` untuk menghasilkan output JSON yang tervalidasi 100%:
```json
{
  "attention_quotient": 64,
  "brain_fog_level": "MODERATE",
  "impulsivity_grade": "HIGH",
  "gdi_interpretation": "Subjek menunjukkan deviasi foveal signifikan pada paruh kedua pengujian...",
  "clinical_summary": "Pola telemetri mengindikasikan kelelahan atensi akibat stimulasi berlebih...",
  "digital_hygiene_prescription": [
    "Terapkan jeda visual 20-20-20 setiap sesi kerja layar",
    "Kurangi konsumsi format video pendek di bawah 60 detik",
    "Lakukan latihan fiksasi statis 3 menit sebelum tidur"
  ]
}
```
- **Medical Guardrail Strict Enforcement:** Dilengkapi *System Instructions* ketat yang melarang vonis medis definitif dan memposisikan sistem sebagai instrumen skrining awal non-farmakologis.

### 3.5 Modul 5: Clinical Dashboard & Export System
- **Interactive Gaze Heatmap:** Render canvas 2D yang memetakan titik tatap mata pengguna langsung di atas bidang pengujian.
- **Attentional Fatigue Curve:** Grafik garis dinamis (Recharts) yang memperlihatkan kurva penurunan performa atensi detik 1 hingga detik 60.
- **One-Click PDF Referral Summary:** Menghasilkan berkas rujukan format PDF resmi satu halaman yang memuat grafik, skor kuantitatif, dan catatan metodologi klinis.

### 3.6 Modul 6: Fail-Safe Benchmark Sandbox (Fitur Penyelamat Demo)
- Toggle tersembunyi pada bilah navigasi: *"Load Clinical Benchmark"*.
- Memuat rekaman telemetri bawaan dari dua profil uji klinis (Subjek Neurotipikal vs Subjek ADHD Berat).
- Menjamin presentasi di panggung kompetisi berjalan 100% sempurna tanpa risiko kendala pencahayaan panggung atau kegagalan kamera laptop.

---

## 4. TECH STACK & ARSITEKTUR SOFTWARE ENGINEERING

| Layer | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router)** | Framework React modern dengan performa tinggi, Server Actions, dan kemudahan deployment Vercel. |
| **Styling & Components** | **Tailwind CSS + Shadcn UI** | Desain bertema *Clinical Dark-Mode* (Slate-950, Cyan-500, Emerald-500) yang elegan dan bersih. |
| **Client-Side Vision** | **MediaPipe Face Mesh & Iris** | Komputasi on-device via WebAssembly; menjaga privasi mutlak tanpa streaming video ke server. |
| **Medical Intelligence** | **Google Gemini 1.5 Flash** | Kecepatan inferensi sub-detik, kuota token luas, dan dukungan *Structured JSON Schema*. |
| **Visualisasi Telemetri**| **HTML5 Canvas + Recharts** | Render jejak koordinat tatapan mata pada 30 FPS dan kurva atensi interaktif. |
| **Dokumen & PDF Engine**| **React-PDF / jsPDF** | Render berkas rujukan medis satu halaman secara instan di peramban klien. |
| **Database (Opsional)** | **Supabase (PostgreSQL)** | Penyimpanan sesi tes anonim dan riwayat komparasi berkala pengguna. |

---

## 5. PENYELARASAN DENGAN KRITERIA PENILAIAN LOGICODIX 2026

Berdasarkan Halaman 17 Buku Panduan Resmi LOGICODIX 2026:

1. **Kesesuaian Masalah & Solusi (Problem-Solution Fit - Bobot 25%):**
   Mengangkat krisis atensi digital generasi muda (*brainrot*, kelelahan dopamin) dan mahalnya asesmen ADHD konvensional, diselesaikan dengan tes 60 detik tanpa alat tambahan.
2. **Inovasi & Implementasi AI (Technology Innovation - Bobot 25%):**
   Mengintegrasikan *on-device computer vision* (MediaPipe) dengan *Medical Intelligence Layer* (Gemini Structured Outputs), sesuai klausul resmi panitia: *"Pemanfaatan AI menjadi nilai tambah"*.
3. **Rekayasa Perangkat Lunak (Software Engineering - Bobot 25%):**
   Arsitektur Next.js modular, pemisahan layer sensorik vs analitik, eksekusi 30 FPS tanpa memory leak, dan dokumentasi repositori GitHub yang rapi.
4. **Desain & Pengalaman Pengguna (UI/UX - Bobot 15%):**
   Antarmuka *clinical-grade dark mode* yang menenangkan, ramah pengguna, gamifikasi interaktif, serta visualisasi heatmap yang memukau.
5. **Prinsip Khusus: Green IT & Etika (Green IT & Ethics - Bobot 10%):**
   - *Green IT:* Pemrosesan on-device WebAssembly memangkas konsumsi daya server cloud GPU secara drastis.
   - *Etika & Privasi:* Zero video storage (aliran video kamera tidak pernah meninggalkan RAM lokal peramban) dan penafian medis (*medical disclaimer*) yang mematuhi etika kedokteran.

---

## 6. ROADMAP & TIMELINE EKSEKUSI HACKING WEEK

- **Pra-Lomba (Oktober – 6 November 2026):**
  - Finalisasi PRD dan pendaftaran resmi tim di portal LOGICODIX.
  - Eksperimen lokal integrasi MediaPipe Iris di Next.js.
  - Penyiapan prompt sistem dan JSON Schema Gemini API.
  - Pembuatan mock dataset klinis untuk fail-safe demo.
- **Hari 1–2 Hacking Week (7–8 November 2026):**
  - Kick-off resmi dan inisialisasi repositori GitHub publik.
  - Pembangunan antarmuka landing page dan modul kalibrasi kamera 4 titik.
- **Hari 3–4 Hacking Week (9–10 November 2026):**
  - Implementasi logika game CPT 60 detik (Go/No-Go engine).
  - Pembangunan Telemetry Aggregation Engine (kalkulasi GDI, RTV, jitter).
  - Pembuatan canvas render untuk Visual Gaze Heatmap.
- **Hari 5 Hacking Week (11 November 2026):**
  - Integrasi API Gemini 1.5 Flash (`/api/analyze`) dengan structured output schema.
  - Penyusunan layout Clinical Dashboard hasil asesmen.
- **Hari 6 Hacking Week (12 November 2026):**
  - Implementasi tombol One-Click PDF Referral Export.
  - Pengujian fitur tersembunyi *Clinical Benchmark Sandbox*.
- **Hari 7 Hacking Week (13–14 November 2026):**
  - Perekaman video demo fungsional produk (durasi 3–5 menit).
  - Penyusunan dokumentasi README GitHub komprehensif.
  - *Final Submission* kode sumber dan tautan video demo sebelum batas waktu 14 November.

---
*Dokumen PRD resmi ini telah diekspor ke format PDF berstandar publikasi profesional dan siap digunakan sebagai cetak biru teknis pengembangan.*
