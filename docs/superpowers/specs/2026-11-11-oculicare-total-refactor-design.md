# OculiCare NeuroFocus - Total Refactor Design Spec

> **Target:** Refactor Total Frontend, Multi-Condition Explanations, Authentication & History Dashboard, Strict Test Integrity Pre-Flight, Full Dynamic Layout, and Anti-Slop Dark/Light System.
> **Date:** 2026-11-11
> **Author:** Hermes Agent & Neil Sawabul Jazil

---

## 1. Vision & Architecture

OculiCare NeuroFocus ditransformasikan dari prototipe CPT sederhana menjadi **Platform Penapisan Atensi & Triase Neurobehavioral Komprehensif**.

### Dials (Anti-Slop Liveliness)
- **ENERGY: 2 (Balanced / High-Trust Medical Engineering)**
- **RHYTHM: 2 (Varied & Structural Flow)**
- **MOTION: 1 (Purposeful Micro-Interactions only, no looping distraction)**

### Aturan Anti-Slop Strict Enforcement:
- **No Em-Dash (`—`)** di seluruh UI copy.
- **No AI Buzzwords** (tidak ada kata 'revolutionary', 'AI-powered', 'seamless', dll).
- **No Dead Controls / Ghost Links** (semua tombol memiliki `onClick` / `href` aktif).
- **Dual Theme Functionality (Light / Dark)** yang bekerja penuh tanpa merusak kontras WCAG AA (min 4.5:1).
- **No Boxed Desktop Framing** (lebar 100% dinamis dengan padding adaptif `clamp(16px, 3.5vw, 64px)`).

---

## 2. Rincian Modul & Fitur Baru

### Modul A: Landing Page Edukatif 4 Spektrum Gangguan Atensi (`/`)
Landing page tidak lagi generik, melainkan menyajikan penjelasan komparatif diferensial:
1. **ADHD Tipe Inatentif:** Melamun kronis (*omission errors* tinggi, *high reaction time variability*).
2. **ADHD Tipe Hiperaktif-Impulsif:** Kegagalan inhibisi motorik (*commission errors* tinggi, salah pencet target merah).
3. **Digital Attention Fatigue & Brain Fog:** Penurunan stamina fokus akibat paparan video pendek (<60 detik) dan multitasking.
4. **Cognitive Burnout & Sleep-Debt:** Kelelahan kerja atau kurang tidur yang memperlambat waktu reaksi (*slow median RT*).
- **Interactive Component:** Matriks perbandingan gejala vs indikator tes CPT.

### Modul B: Sistem Akun & Dashboard Riwayat Pengguna (`/login`, `/register`, `/dashboard`)
- **Autentikasi Lokal Mandiri:** Pengguna dapat mendaftar (Nama, Email, Password) dan login. Sesi disimpan di `localStorage` (dengan mock backend / Supabase ready auth provider) sehingga tidak memerlukan setup server database rumit saat demo offline di panggung.
- **Halaman Dashboard (`/dashboard`):**
  - Profil pengguna & tanggal bergabung.
  - Kartu statistik komparatif (rata-rata waktu reaksi, persentase keberhasilan).
  - Tabel riwayat penapisan (tanggal, ID sesi, skor ASRS, durasi, status kualitas data).
  - Aksi unduh ulang laporan PDF & data JSON untuk setiap sesi yang tersimpan.

### Modul C: Gerbang Integritas Pengujian Ketat (`/screening`)
Sebelum tes CPT 60 detik dapat dimulai, pengguna wajib melewati checklist 4 syarat ketat:
1. **Camera Active & Verified:** Verifikasi wajah lokal di peramban via MediaPipe (tersimpan offline di `/public/mediapipe/`).
2. **Fullscreen Mode Enforcement:** Tombol mengunci browser ke mode layar penuh (`document.documentElement.requestFullscreen()`).
3. **Screen / Window Lock & Focus Shield:** Deteksi event `document.onvisibilitychange` dan `window.onblur`. Jika pengguna berpindah tab atau meminimize window saat tes berjalan, tes langsung otomatis dijeda (*paused*) dan diberi peringatan pelanggaran fokus.
4. **Display Recording & System Ready Indicator:** Konfirmasi lingkungan tes bebas distraksi sebelum countdown 3-2-1 dimulai.

### Modul D: Theme Engine (Dual Dark & Light Mode)
- Toggle tema di navbar (`☀️ Terang` / `🌙 Gelap`).
- Menggunakan atribut `data-theme="dark"` / `data-theme="light"` pada tag `<html>`.
- Variabel CSS token yang terkalibrasi:
  - **Dark Mode:** Canvas `#090b0e`, Surface `#111419`, Border `#212833`, Text `#f0f3f6`.
  - **Light Mode:** Canvas `#f8fafc`, Surface `#ffffff`, Border `#e2e8f0`, Text `#0f172a`, Text Muted `#64748b`.

---

## 3. Rencana Pengujian (Test-Driven Development)
1. `src/lib/auth/auth.test.mjs`: Menguji register, login, session persistence, dan hashing sederhana.
2. `src/lib/storage/history.test.mjs`: Menguji penambahan riwayat sesi, pembacaan riwayat per user, dan kalkulasi tren.
3. Unit tests yang sudah ada (`asrs.test.mjs`, `engine.test.mjs`, `estimate.test.mjs`, `quality.test.mjs`, `session.test.mjs`) tetap wajib 100% pass (total 14 test cases lama + test cases baru).
