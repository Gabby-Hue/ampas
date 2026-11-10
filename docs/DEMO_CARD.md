# OculiCare NeuroFocus — Demo Card

## Sebelum tampil

```powershell
cd C:\Project\oculi\web
npm.cmd run dev
```

Buka `http://localhost:3000`. Gunakan Chrome/Edge terbaru, tutup aplikasi yang memakai kamera, dan siapkan satu browser window untuk demo.

## Urutan demo 5 menit

1. **Landing (30 detik)** — Tekankan: performa perhatian, bukan diagnosis; kamera opsional; video tidak disimpan.
2. **Setup (45 detik)** — Centang consent, tunjukkan device check, lalu selesaikan latihan Go dan No-Go.
3. **Benchmark (60 detik)** — Klik `Stable`, jelaskan `DEMO-STABLE` dan `Fixture sintetis`.
4. **Dashboard (90 detik)** — Tunjukkan median RT, hit, omission, commission, correct rejection, attention curve, dan kualitas sesi.
5. **AI + artefak (45 detik)** — Klik `Buat penjelasan aman`, lalu tunjukkan `Cetak / simpan PDF` dan `Unduh data JSON`.
6. **Fallback (30 detik)** — Jelaskan bahwa CPT tetap berfungsi tanpa kamera, dan AI kembali ke fallback lokal jika jaringan/key gagal.

## Kalimat inti

> “OculiCare mengukur performa pada satu tugas perhatian singkat. Ia tidak mendiagnosis ADHD atau kondisi klinis apa pun.”

> “Kamera hanya dipakai sebagai indikator teknis opsional. Frame diproses di browser dan tidak dikirim ke server.”

## Jika juri bertanya

| Pertanyaan | Jawaban singkat |
|---|---|
| Mengapa 60 detik? | Durasi akses awal dan demo; bukan pengganti asesmen klinis. |
| Apa arti omission? | Target Go yang tidak ditekan. |
| Apa arti commission? | Respons yang diberikan pada target No-Go. |
| Apa arti correct rejection? | Berhasil menahan respons pada target No-Go. |
| Bagaimana jika kamera ditolak? | CPT tetap berjalan dan hasil tetap transparan soal keterbatasan sensor. |
| Bagaimana jika AI gagal? | Penjelasan lokal deterministic digunakan. |
| Apakah data pasien disimpan? | Tidak; benchmark juga diberi label sintetis. |

## Mode darurat

- Kamera gagal: lanjut tanpa kamera, sebutkan `gaze unavailable`.
- Model lambat: gunakan benchmark sintetis, jangan menunggu model.
- AI gagal: tunjukkan fallback lokal dan tetap lanjut ke PDF.
- Waktu mepet: klik `Akhiri sesi`, lalu jelaskan status `limited`/`insufficient`.
