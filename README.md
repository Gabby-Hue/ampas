# OculiCare NeuroFocus

Web-based attention performance screening untuk akses rujukan awal. OculiCare menggabungkan tugas **Go/No-Go CPT** singkat dengan indikator kamera opsional yang diproses lokal.

> OculiCare bukan alat diagnosis ADHD atau kondisi klinis lain. Hasil hanya menggambarkan performa pada satu tugas singkat.

## Jalankan lokal

```powershell
npm.cmd run dev
```

Buka `http://localhost:3000` lalu pilih **Mulai screening**.

## Script

| Script | Fungsi |
|---|---|
| `npm.cmd run dev` | Development server |
| `npm.cmd run lint` | ESLint |
| `npm.cmd test` | Test CPT engine, gaze estimator, quality gate, dan export schema |
| `npm.cmd run build` | Production build |
| `npm.cmd start` | Menjalankan hasil production build |

Untuk release check, jalankan `npm.cmd audit --omit=dev`; dependency production saat ini tidak memiliki advisory.

Dependency vision sudah tercantum di `package.json` melalui `@mediapipe/tasks-vision`; tidak perlu install tambahan setelah checkout.

## Alur produk

1. Landing page menjelaskan tujuan dan batasan.
2. User memberi informed consent.
3. Pengguna menyelesaikan latihan Go/No-Go singkat sebelum tes aktif.
4. Device check memberi tahu dukungan browser dan kamera; kamera tetap opsional.
5. CPT berjalan 60 detik: hijau/Go ditekan, merah/No-Go ditahan.
6. Engine menghitung hit, omission, commission, correct rejection, reaction time, dan attention curve.
7. Dashboard menampilkan ID sesi anonim, status kualitas sesi, plot posisi iris relatif bila quality gate usable, glossary, penjelasan AI/fallback, dan metodologi. Tanpa kalibrasi layar, plot tidak mengukur fokus pada target.
8. Hasil dapat dicetak sebagai PDF browser atau diekspor sebagai JSON agregat tanpa video/frame.

## Demo benchmark

Pada halaman setup, centang consent, selesaikan dua langkah latihan, lalu pilih salah satu:

- **Stable** — data sintetis dengan respons Go konsisten.
- **Variable** — data sintetis dengan omission dan commission yang lebih terlihat.

Benchmark selalu berlabel data sintetis dan tidak merepresentasikan pasien.

## Privasi dan keamanan

- Kamera menggunakan `getUserMedia` lokal browser.
- Video/frame tidak di-upload atau disimpan.
- Model MediaPipe dan WASM dapat diambil dari CDN saat kamera diaktifkan; frame tetap diproses lokal dan tidak dikirim.
- Stream dihentikan ketika sesi selesai atau halaman ditutup.
- Payload analisis hanya berisi metrik agregat.
- Consent diperlukan sebelum kamera, tes, atau benchmark.
- Jika Gemini tidak tersedia, analisis lokal deterministic digunakan.

## Analisis AI opsional

Endpoint `POST /api/analyze` memvalidasi metrik dan memiliki guardrail non-diagnostik. Tanpa key, endpoint memakai `local-guardrail-v1`. Untuk mengaktifkan Gemini, buat `web/.env.local` secara lokal dan jangan commit file tersebut:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Server hanya mengirim metrik CPT/gaze agregat. Respons Gemini harus berupa JSON tervalidasi; timeout, error, atau JSON invalid kembali ke fallback lokal.

## Struktur penting

```text
src/app/page.tsx                 landing page
src/app/screening/page.tsx       setup, kamera, CPT, dashboard
src/app/api/analyze/route.ts     AI/fallback analysis endpoint
src/lib/cpt/engine.ts            deterministic CPT engine dan metrics
src/lib/cpt/engine.test.mjs      engine tests
src/lib/gaze/tracking.ts         MediaPipe client-only adapter dan local trace
src/lib/gaze/quality.ts           quality gate dan relative dispersion
src/lib/export/session.ts         pure aggregate JSON export builder
```

## Dokumentasi lomba

- `../docs/PRD_OculiCare_NeuroFocus_v2.md`
- `../docs/WHY_REVISI.md`
- `../docs/PRESENTATION_RUNBOOK.md`
- `../docs/QA_CHECKLIST.md`
- `../docs/DEMO_CARD.md`
