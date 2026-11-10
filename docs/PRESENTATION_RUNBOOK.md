# Runbook Presentasi OculiCare NeuroFocus

## Menjalankan aplikasi

Untuk versi satu halaman yang bisa dibawa saat pitching, lihat `DEMO_CARD.md`.

Dari folder `web`:

```powershell
npm.cmd run dev
```

Buka `http://localhost:3000`, lalu pilih **Mulai screening**.

## Demo 7 menit

### 0:00–0:45 — Masalah

Jelaskan bahwa banyak orang membutuhkan pemahaman awal tentang performa perhatian, tetapi akses konsultasi profesional tidak selalu cepat atau murah. Tekankan bahwa OculiCare bukan alat diagnosis.

### 0:45–1:30 — Produk

Tunjukkan landing page dan tiga prinsip:

- performa, bukan diagnosis;
- privasi dari awal;
- hasil yang bisa dibawa untuk percakapan dengan tenaga profesional.

Di setup, tunjukkan device check dan ID sesi anonim yang baru dibuat setelah tes dimulai. Jelaskan bahwa metadata ini tidak mengidentifikasi pengguna.

### 1:30–2:15 — Privasi dan gaze opsional

Masuk ke halaman screening. Jalankan latihan Go lalu konfirmasi No-Go agar aturan tugas terlihat jelas. Jelaskan bahwa kamera opsional, preview lokal, dan video tidak dikirim atau disimpan. Jika kamera diaktifkan, MediaPipe menghitung indikator gaze-quality di browser; frame tidak dikirim. Untuk demo panggung, kamera boleh tidak diaktifkan.

### 2:15–3:00 — Benchmark repeatable

Setelah latihan selesai, klik **Stable** atau **Variable** pada bagian demo benchmark. Sebutkan dengan jelas:

> “Ini data sintetis untuk memperagakan alur dashboard, bukan data pasien.”

Tunjukkan median reaction time, hit rate, omission error, dan commission error.

Jika gaze usable, tunjukkan plot posisi iris relatif terhadap sudut mata. Jelaskan bahwa tanpa kalibrasi layar, plot tidak menunjukkan fokus pada target dan bukan biomarker klinis.

### 3:00–4:15 — Tes nyata

Kembali dan mulai tes. Jelaskan aturan:

- hijau/Go: tekan tombol atau Space;
- merah/No-Go: jangan tekan;
- tes berlangsung 60 detik.
- Tombol **Akhiri sesi** tersedia jika presenter ingin mempercepat demo; hasilnya tetap diberi status kualitas sesuai jumlah trial.

Lakukan beberapa respons dengan sengaja bervariasi agar hasil dapat dijelaskan. Jangan menyebut hasil sebagai diagnosis.

### 4:15–5:00 — Hasil

Tunjukkan dashboard hasil dan jelaskan perbedaan:

- **omission error:** target Go terlewat;
- **commission error:** respons diberikan pada target No-Go;
- **reaction time:** waktu dari stimulus ke respons.

### 5:00–5:45 — PDF

Klik **Cetak / simpan PDF**. Pada dialog browser pilih “Save as PDF”. Jelaskan bahwa ringkasan berisi metodologi, metrik, dan batasan.

Jika waktu cukup, klik **Unduh data JSON** untuk menunjukkan bahwa artefak yang dapat dibawa hanya berisi metrik agregat, bukan video atau frame.

### 5:45–7:00 — Rekayasa dan dampak

Tunjukkan bahwa:

- CPT tetap berjalan tanpa kamera;
- engine metrik deterministic dan memakai fixture seeded;
- stream kamera dihentikan saat sesi selesai;
- AI dan gaze module dirancang sebagai lapisan tambahan, bukan pengambil keputusan medis.
- FaceLandmarker gagal atau model tidak tersedia: status gaze menjadi unavailable, sementara CPT dan benchmark tetap berfungsi.
- Saat sesi berjalan, video monitor tetap lokal dan tersembunyi; yang tampil ke pengguna tetap stimulus CPT.

## Jawaban Q&A penting

### Apakah ini mendiagnosis ADHD?

Tidak. Produk mengukur performa pada tugas perhatian singkat. Diagnosis membutuhkan evaluasi profesional, riwayat perkembangan, dan konteks lintas aktivitas.

### Mengapa memakai kamera?

Kamera hanya lapisan opsional untuk indikator gaze-quality eksperimental. CPT tetap menjadi fitur inti dan tetap bisa dipakai saat kamera ditolak.

### Apakah video dikirim ke server?

Tidak. Preview menggunakan MediaStream lokal browser. MVP tidak menyimpan atau mengunggah video.

### Mengapa hanya 60 detik?

Durasi ini dipilih untuk akses awal dan demo MVP. Produk tidak mengklaim bahwa sesi 60 detik setara dengan asesmen klinis.

### Bagaimana jika AI atau internet gagal?

Metrik CPT dihitung lokal secara deterministic. Penjelasan AI harus menjadi lapisan tambahan dengan fallback lokal.

### Apa kebaruan produknya?

Integrasi browser-based CPT, privasi on-device, gaze-quality opsional, hasil yang transparan, dan ringkasan rujukan dalam alur yang mudah diakses.

## Checklist sebelum final

- [ ] Jalankan `npm.cmd run lint`.
- [ ] Jalankan `npm.cmd run build` dan simpan output final.
- [ ] Uji landing page dan `/screening` di laptop demo.
- [ ] Uji tombol Space dan tombol layar.
- [ ] Uji kamera ditolak: tes tetap dapat dimulai.
- [ ] Uji kamera diterima: preview lokal tampil dan stream berhenti setelah tes.
- [ ] Uji demo benchmark.
- [ ] Uji “Cetak / simpan PDF”.
- [ ] Rekam video 3–5 menit tanpa memperlihatkan data pribadi.
- [ ] Siapkan fixture benchmark offline untuk panggung.
