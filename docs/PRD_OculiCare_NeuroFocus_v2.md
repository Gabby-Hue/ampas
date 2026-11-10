# PRODUCT REQUIREMENT DOCUMENT (PRD)
## OculiCare NeuroFocus
### Web-Based Attention Performance Screening untuk Akses Rujukan Awal

- **Versi:** 2.0.0
- **Status:** Revisi untuk MVP LOGICODIX 2026
- **Target:** LOGICODIX 2026, subtema Inclusive Health & Well-being
- **Platform:** Web responsive, dengan prioritas laptop/desktop untuk demo
- **Durasi sesi:** sekitar 90 detik: persetujuan, pemeriksaan kualitas, latihan singkat, dan tes 60 detik

> **Batasan klinis:** OculiCare bukan alat diagnosis ADHD, bukan alat diagnosis gangguan mental, dan bukan pengganti psikolog atau psikiater. Produk ini mengukur performa pada tugas perhatian singkat dan membantu pengguna memutuskan apakah konsultasi profesional layak dipertimbangkan.

---

## 1. Ringkasan Produk

OculiCare NeuroFocus adalah aplikasi web yang menggabungkan **Continuous Performance Task (CPT) Go/No-Go** dengan indikator kestabilan tatapan berbasis kamera. Pengguna menyelesaikan tugas 60 detik, lalu menerima ringkasan hasil yang berisi metrik performa, kualitas sensor, keterbatasan pengukuran, dan saran langkah berikutnya.

Pemrosesan video dilakukan di browser. Video tidak diunggah atau disimpan. Data yang dapat dikirim ke layanan AI hanya berupa metrik agregat yang tidak berisi video, foto, atau identitas langsung pengguna.

### 1.1 Masalah yang ditangani

- Banyak orang membutuhkan pemahaman awal tentang kesulitan mempertahankan perhatian sebelum mencari bantuan.
- Akses ke tenaga profesional tidak selalu cepat, murah, atau tersedia di semua daerah.
- Kuesioner mandiri saja tidak menggambarkan performa aktual pada suatu tugas.
- Pengguna memerlukan ringkasan yang mudah dipahami dan dapat dibawa saat konsultasi.

OculiCare tidak menyimpulkan penyebab kesulitan perhatian dan tidak mengaitkannya secara kausal dengan penggunaan media sosial.

### 1.2 Nilai pembeda

1. Sesi singkat berbasis browser tanpa perangkat eye tracker khusus.
2. CPT dan indikator gaze-quality ditampilkan bersama, tetapi dipisahkan antara metrik observasi dan interpretasi.
3. Video diproses lokal dan tidak disimpan.
4. Hasil dirancang sebagai **rujukan awal**, bukan vonis medis.
5. Mode benchmark sintetis yang diberi label jelas untuk demo dan pengujian reproduktif.

---

## 2. Tujuan dan Non-Tujuan

### 2.1 Tujuan MVP

- Menghasilkan tes Go/No-Go yang konsisten dan dapat selesai dalam 60 detik.
- Mengukur reaction time, reaction-time variability, omission error, commission error, serta kestabilan tatapan secara relatif.
- Memberi pengguna hasil yang transparan tentang performa dan kualitas pengukuran.
- Menghasilkan PDF ringkasan rujukan satu halaman.
- Mendemonstrasikan privasi on-device, integrasi AI yang terkendali, dan UX yang mudah dipahami.

### 2.2 Non-tujuan

- Mendiagnosis ADHD atau kondisi klinis lain.
- Menghasilkan skor DSM-5 atau label “normal/ADHD”.
- Mengklaim ambang klinis universal untuk GDI, pupil, atau microsaccade.
- Mengukur microsaccade secara klinis dengan kamera 30 FPS.
- Menggunakan LLM untuk menghitung skor CPT atau mengambil keputusan medis.
- Menyimpan rekaman wajah, video, atau frame kamera.

---

## 3. Alur Pengguna

1. **Landing dan informed notice** — tujuan, batasan, privasi, dan pilihan “lanjut tanpa kamera”.
2. **Pemeriksaan perangkat** — browser, kamera, pencahayaan, posisi wajah, dan frame rate.
3. **Kalibrasi opsional 4 titik** — menghasilkan pemetaan gaze relatif; jika kualitas rendah, gaze module dinonaktifkan tanpa menggagalkan CPT.
4. **Latihan singkat** — memastikan pengguna memahami Go dan No-Go.
5. **CPT 60 detik** — target Go 70%, No-Go 30%, ISI pseudorandom 1.000–2.200 ms.
6. **Pemrosesan lokal** — agregasi metrik di browser.
7. **Dashboard hasil** — performa CPT, gaze-quality, kualitas data, dan rekomendasi langkah berikutnya.
8. **Ringkasan AI opsional** — hanya memakai payload agregat dengan schema tervalidasi.
9. **Ekspor PDF** — berisi metodologi, hasil, keterbatasan, dan disclaimer.

---

## 4. Spesifikasi Fungsional

### 4.1 CPT Engine

- Target **Go**: beacon hijau; pengguna menekan Space atau tombol tap.
- Target **No-Go**: asteroid merah; pengguna menahan respons.
- Proporsi target dapat dikonfigurasi, default 70/30.
- ISI dipilih dari rentang 1.000–2.200 ms dengan seed yang dicatat untuk reproduksi.
- Event menyimpan timestamp monotonic, jenis target, respons, dan latency.
- Hasil minimum: jumlah Go/No-Go, hit, omission, commission, mean RT, median RT, dan RT standard deviation.

### 4.2 Gaze-quality Module

- MediaPipe Face Mesh/Iris berjalan lokal jika browser mendukung.
- Sistem menyimpan koordinat ternormalisasi, confidence, face visibility, head pose sederhana, dan timestamp.
- Metrik utama disebut **relative gaze stability**, bukan biomarker klinis.
- Gaze-quality dihitung hanya pada frame yang melewati quality gate.
- Jika pencahayaan atau posisi wajah buruk, dashboard menyatakan “data gaze tidak cukup” dan CPT tetap dapat dinilai.
- Tidak ada inferensi microsaccade klinis.

Contoh metrik relatif:

```text
relative_gaze_dispersion = RMS jarak koordinat gaze ternormalisasi
fixation_loss_rate       = proporsi frame valid di luar area target
gaze_data_coverage       = frame valid / seluruh frame
```

Threshold pada MVP adalah **threshold teknis kualitas data**, bukan batas diagnosis. Nilai dan metode perhitungannya harus ditampilkan di dokumentasi.

### 4.3 Quality Gate

Sesi menghasilkan status:

- `usable`: coverage dan timestamp memadai;
- `limited`: CPT tersedia, gaze terbatas;
- `invalid`: event atau sensor terlalu tidak lengkap untuk interpretasi.

Penyebab status ditampilkan kepada pengguna, misalnya pencahayaan rendah, wajah keluar frame, atau respons terlalu sedikit.

### 4.4 Analysis API dan AI

Backend menerima payload agregat minimal:

```json
{
  "test_version": "2.0",
  "duration_seconds": 60,
  "cpt": {
    "go_trials": 0,
    "no_go_trials": 0,
    "hit_rate": 0,
    "omission_rate": 0,
    "commission_rate": 0,
    "median_rt_ms": 0,
    "rt_variability_ms": 0
  },
  "gaze": {
    "status": "usable",
    "data_coverage": 0,
    "relative_dispersion": 0,
    "fixation_loss_rate": 0
  }
}
```

AI hanya boleh:

- menjelaskan metrik dengan bahasa sederhana;
- menyebutkan keterbatasan dan kualitas data;
- memberi saran kebiasaan umum yang berisiko rendah;
- menyarankan konsultasi profesional bila pengguna mengalami keluhan menetap.

Skor dihitung oleh kode deterministik. Response schema divalidasi, timeout ditetapkan, dan aplikasi memiliki fallback lokal jika API gagal. Prompt tidak boleh meminta diagnosis, prognosis, atau rekomendasi obat.

### 4.5 Dashboard dan PDF

Dashboard wajib menampilkan:

- metrik CPT dan definisinya;
- grafik perubahan performa per blok waktu;
- status kualitas sensor;
- gaze visualization hanya jika data usable;
- disclaimer “screening performa, bukan diagnosis”;
- tombol ulangi tes dan ekspor PDF.

PDF satu halaman berisi tanggal/sesi anonim, versi tes, metrik, status kualitas data, metodologi singkat, keterbatasan, dan anjuran mencari tenaga profesional bila keluhan mengganggu aktivitas.

### 4.6 Demo Benchmark

- Data benchmark bersifat sintetis dan tidak disebut sebagai data pasien.
- Mode diberi label **Demo Mode — Synthetic Benchmark Data**.
- Tersedia profil “stable performance” dan “variable performance” untuk menguji dashboard.
- Mode ini tidak boleh digunakan untuk menggantikan tes pengguna dalam laporan nyata.

---

## 5. Privasi, Etika, dan Keamanan

- Kamera memerlukan persetujuan eksplisit dan dapat ditolak.
- Video/frame tidak dikirim ke server dan tidak disimpan.
- Payload AI tidak memuat nama, email, foto, atau video.
- Sesi anonim menggunakan ID acak bila penyimpanan diperlukan.
- Pengguna dapat menjalankan CPT tanpa kamera.
- Semua hasil mencantumkan batasan non-diagnostik.
- Aplikasi menyediakan tautan bantuan profesional dan instruksi darurat umum tanpa mencoba menangani krisis secara otomatis.
- README menjelaskan data yang diproses, data yang tidak dikumpulkan, model AI, fallback, serta lisensi aset.

---

## 6. Arsitektur MVP

| Layer | Teknologi | Tanggung jawab |
|---|---|---|
| UI | Next.js App Router, React, Tailwind | Alur sesi dan dashboard |
| CPT | TypeScript deterministic engine | Stimulus, timestamp, respons |
| Vision | MediaPipe lokal/WASM | Landmark, quality gate, gaze relatif |
| Aggregation | TypeScript pure functions | Metrik dan status sesi |
| AI | Gemini API melalui server route | Penjelasan terstruktur non-diagnostik |
| Visualization | Canvas/SVG dan Recharts | Grafik performa dan gaze |
| PDF | jsPDF atau React-PDF | Ringkasan rujukan |
| Persistence | Tidak wajib untuk MVP | Jika dipakai, hanya data anonim dan opt-in |

Prinsip arsitektur: CPT harus tetap berfungsi ketika vision, AI, atau koneksi jaringan gagal.

---

## 7. Acceptance Criteria

- Sesi dapat dimulai tanpa kamera.
- CPT 60 detik menghasilkan event yang konsisten pada desktop dan mobile browser yang didukung.
- Tidak ada video/frame yang masuk ke request network.
- Gaze module dapat gagal secara graceful tanpa menggagalkan sesi.
- Metrik yang sama dari fixture yang sama menghasilkan output yang sama.
- API AI memiliki schema validation, timeout, error state, dan fallback lokal.
- PDF dapat dibuka dan memuat disclaimer serta metodologi.
- Demo benchmark dapat diulang dan selalu menghasilkan dashboard yang sama.
- Build produksi dapat dijalankan dari repository dan langkah setup terdokumentasi.

---

## 8. Batasan dan Rencana Validasi

MVP belum membuktikan validitas klinis atau kemampuan membedakan ADHD dari populasi umum. Sebelum penggunaan klinis, diperlukan studi dengan protokol etis, sampel memadai, pembanding tes tervalidasi, dan supervisi profesional.

Validasi lomba berfokus pada:

- ketepatan event dan metrik terhadap fixture;
- kestabilan runtime dan frame processing;
- keterbacaan UX;
- verifikasi network bahwa video tidak keluar;
- pengujian lintas browser/perangkat yang tersedia;
- kejujuran output saat data sensor buruk atau AI tidak tersedia.

---

## 9. Penyelarasan dengan LOGICODIX 2026

- **Problem-Solution Fit (25%):** akses awal terhadap pemahaman performa perhatian dan ringkasan rujukan.
- **Technology Innovation (25%):** CPT browser, computer vision on-device, quality gate, dan AI terstruktur yang terkontrol.
- **Software Engineering (25%):** modular, deterministic, graceful degradation, fixture test, dan dokumentasi setup.
- **UI/UX (15%):** alur singkat, bahasa non-stigmatis, visualisasi yang dapat dijelaskan.
- **Green IT & Ethics (10%):** komputasi lokal, minimisasi data, consent, transparansi AI, dan disclaimer.

---

## 10. Roadmap Hacking Week

1. **Hari 1:** shell aplikasi, consent, CPT fixture, dan event schema.
2. **Hari 2:** CPT interaktif, keyboard/touch, timer, dan hasil deterministik.
3. **Hari 3:** MediaPipe, kalibrasi opsional, quality gate, dan graceful fallback.
4. **Hari 4:** aggregation, dashboard, grafik, dan status kualitas.
5. **Hari 5:** AI explanation endpoint, schema validation, timeout, fallback.
6. **Hari 6:** PDF, demo benchmark berlabel, privasi network check, dan polish UX.
7. **Hari 7:** build lokal, video 3–5 menit, README, rehearsal 7 menit, dan Q&A.

---

## 11. Pesan Demo Utama

> “OculiCare tidak mendiagnosis ADHD. OculiCare membuat pengukuran awal performa perhatian menjadi lebih mudah diakses, transparan, dan aman untuk menjadi bahan percakapan dengan tenaga profesional.”

