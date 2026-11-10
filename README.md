# OculiCare NeuroFocus

> **Kategori:** Web Application  
> **Subtema LOGICODIX 2026:** Subtema 4 — Inclusive Health & Well-being  
> **Target Kompetisi:** LOGICODIX 2026 (HIMTI UNESA)  
> **Posisi Produk:** Web-Based Attention Performance Screening & Early Referral Aid (Termometer Atensi Digital, Bukan Alat Diagnosis Klinis / DSM-5 Mandiri).

OculiCare NeuroFocus adalah aplikasi web penapisan awal performa perhatian neurobehavioral yang menggabungkan **Continuous Performance Task (CPT) Go/No-Go** terstandar dengan pelacakan fiksasi tatapan mata berbasis kamera lokal (MediaPipe WASM on-device) serta integrasi kuesioner baku **WHO ASRS v1.1 Part A**.

---

## 1. Problem Statement & Solusi

### Masalah
- **Krisis Rentang Atensi Digital:** Paparan konstan terhadap stimulasi dopaminergik format video cepat (<60 detik) memicu kelelahan kognitif (*attention fatigue*) dan refleks motorik terburu-buru (*impulsive tapping*).
- **Hambatan Aksesibilitas Klinis:** Biaya konsultasi asesmen awal ke psikiater/psikolog klinis berkisar Rp500.000–Rp2.500.000 dengan waktu antrean berminggu-minggu di luar kota besar.
- **Bahaya Self-Diagnosis Liar:** Meningkatnya tren diagnosis mandiri di media sosial tanpa basis data objektif.

### Solusi OculiCare
- **Skrining Triangulasi Objektif:** Menggabungkan konfirmasi keluhan kronis 6 bulan (WHO ASRS v1.1, 6 item) dengan pengujian performa motorik aktual (CPT Go/No-Go 60 detik) dan kestabilan okulomotor.
- **Dual-Tone Copywriting:** Menyajikan 2 sudut pandang hasil secara terpisah:
  1. *Versi Pengguna (Awam & Bersahabat):* Menjelaskan stamina fokus, gaya distraksi (melamun vs terburu-buru), dan 3 langkah kebiasaan harian praktis.
  2. *Versi Lembar Rujukan (Medis Formal):* Format dokumen klinis satu halaman A4 yang siap dibawa saat berkonsultasi dengan dokter/psikolog.
- **Privacy-by-Design (100% On-Device):** Tidak ada video, foto, atau frame kamera yang diunggah ke server. Seluruh pemrosesan landmark iris berjalan di RAM peramban via WebAssembly lokal offline.

---

## 2. Fitur MVP yang Berfungsi

1. **WHO ASRS v1.1 Part A Screener:** 6 pertanyaan baku WHO untuk memvalidasi keluhan inatensi dan impulsivitas dalam 6 bulan terakhir.
2. **Deterministic CPT Go/No-Go Engine:** Siklus psikometri baku (stimulus aktif 250 ms flash dilanjutkan fiksasi netral `+` selama sisa jeda 1000–2200 ms).
3. **On-Device Eye Tracking (MediaPipe WASM):** Estimasi kestabilan tatapan mata relatif tanpa mengunggah data kamera ke server. Berjalan 100% offline dari aset `/public/mediapipe/`.
4. **Adaptive Pad / Touch Viewport:** Layout bebas scroll (`100dvh`) yang ergonomis untuk tablet/pad dengan tombol *Dual-Thumb Touchpad* besar.
5. **3-Card Pillar Results Dashboard:** Kartu Stamina Fokus, Kartu Gaya Distraksi, dan Kartu Korelasi Gejala Kronis.
6. **Attention Fatigue Curve:** Visualisasi ketahanan atensi per 10 detik (Blok 1 s.d. 6).
7. **Clinical Gaze Plot:** Visualisasi dispersi fiksasi tatapan mata (aktif pada uji kamera riil maupun simulasi sintetis).
8. **One-Click Clinical Referral PDF Export:** Format cetak A4 1 halaman presisi untuk rujukan medis.
9. **Dual-Profile Synthetic Benchmark:** Pilihan profil *Stable* dan *Variable* berlabel data sintetis untuk keperluan live demo panggung yang bebas risiko pencahayaan.
10. **Medical Intelligence & Fallback:** Integrasi Gemini 1.5 Flash API dengan *strict JSON schema validation* serta fallback deterministik lokal `local-dual-tone-guardrail-v2`.

---

## 3. Tech Stack & Arsitektur

| Layer | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) | React 19, Server Actions, performa tinggi, zero-config deployment. |
| **Styling** | Tailwind CSS v4 | Clean monochrome aesthetic, responsive touch triggers, CSS print layout. |
| **Client Vision** | MediaPipe Tasks Vision (WASM offline) | Ekstraksi landmark wajah & iris on-device tanpa ketergantungan CDN cloud. |
| **Medical Intelligence**| Google Gemini 1.5 Flash API | Inferensi cepat dengan validasi skema JSON terstruktur tanpa overclaim medis. |
| **Deterministic Engine** | Pure TypeScript (`/src/lib/cpt`) | Seeded random number generator, zero floating-point drift, 100% reproducible. |
| **Testing** | Node.js Test Runner (`node --test`) | Cepat, native tanpa overhead dependensi eksternal, 14 test cases lolos. |

---

## 4. Panduan Menjalankan Lokal

### Prasyarat
- Node.js versi 20.x atau 22.x+
- npm versi 9.x+

### Instalasi & Menjalankan
```bash
# Clone repositori
git clone https://github.com/neixcyll/OculiCare-NeuroFocus.git
cd OculiCare-NeuroFocus

# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev
```

Buka peramban di `http://localhost:3000`.

### Script Tersedia
- `npm run dev` : Menjalankan development server lokal (`localhost:3000`).
- `npm run lint` : Memeriksa standar kode dengan ESLint (`0 errors, 0 warnings`).
- `npm test` : Menjalankan 14 unit test untuk scoring ASRS, CPT engine, gaze quality gate, dan session export.
- `npm run build` : Mengompilasi aplikasi ke versi produksi.
- `npm run start` : Menjalankan server produksi lokal.

---

## 5. Konfigurasi Lingkungan (`.env`)

Aplikasi dilengkapi dengan fallback deterministik lokal 100% sehingga tetap berfungsi penuh tanpa API Key. Untuk mengaktifkan sintesis Gemini API secara live:

1. Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Isi nilai API key dari Google AI Studio:
   ```env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-1.5-flash
   ```

---

## 6. Dokumentasi Penggunaan AI & Etika Digital

- **Peran AI:** Model Gemini hanya digunakan sebagai *Medical Translator & Explanation Layer* yang menerjemahkan data statistik mentah ke dalam dua versi narasi: bahasa awam dan bahasa rujukan klinis.
- **Batas Kewenangan:** AI **dilarang keras** memvonis diagnosis ADHD/gangguan saraf, dilarang meresepkan obat, dan dilarang menentukan kelayakan klinis secara mutlak.
- **Privacy Assurance:** Hanya metrik agregat teranonimkan (angka persentase, milidetik) yang dikirim ke endpoint API. Foto, video, frame wajah, dan nama pengguna **tidak pernah** dikirim atau disimpan.
- **Offline / Localhost Guarantee:** Seluruh aset WASM dan model `face_landmarker.task` tersimpan lokal di dalam `/public/mediapipe/`, menjamin live demo panggung tetap berfungsi normal tanpa koneksi internet.

---

## 7. Atribusi Pihak Ketiga & Referensi Ilmiah

- **Kuesioner ASRS v1.1:** World Health Organization (WHO) Adult ADHD Self-Report Scale v1.1 Screener (Kessler et al., 2005, 2007).
- **Paradigma CPT:** Conners Continuous Performance Test 3 (Conners, 2014) & Test of Variables of Attention (T.O.V.A.).
- **Komputasi Vision:** Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`).
- **Font & Ikon:** Geist Font Family (Vercel) & SVG UI Icons.

---

## 8. Dokumen Pendukung Lomba

Seluruh berkas perencanaan arsitektur, panduan pitching panggung, dan daftar pengujian mutu tersimpan di folder `/docs`:
- `docs/PRD_OculiCare_NeuroFocus_v2.md` : Product Requirement Document resmi v2.0.
- `docs/PRESENTATION_RUNBOOK.md` : Panduan presentasi & live demo 7 menit panggung Grand Final.
- `docs/DEMO_CARD.md` : Kartu saku ringkasan alur pitching dan mitigasi darurat panggung.
- `docs/QA_CHECKLIST.md` : Checklist verifikasi mutu sebelum pengumpulan dan presentasi.
- `docs/WHY_REVISI.md` : Rasionalisasi ilmiah perombakan dari PRD v1 ke PRD v2.
