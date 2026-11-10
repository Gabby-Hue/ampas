# QA Checklist OculiCare NeuroFocus

Gunakan checklist ini sebelum merekam video dan sebelum final pitching. Catat browser, OS, resolusi layar, dan tanggal pengujian.

## A. Baseline aplikasi

- [ ] `npm.cmd run lint` berhasil.
- [ ] `npm.cmd test` menghasilkan 12 test pass.
- [ ] `npm.cmd run build` selesai dan menampilkan route `/`, `/screening`, `/api/analyze`.
- [ ] `npm.cmd audit --omit=dev` tidak menemukan vulnerability production.
- [ ] `npm.cmd run dev` dapat membuka landing page.

## B. Landing dan setup

- [ ] Headline menjelaskan performa perhatian, bukan diagnosis.
- [ ] CTA menuju `/screening` bekerja.
- [ ] Halaman setup menjelaskan Go/No-Go, durasi 60 detik, kamera opsional, dan privasi.
- [ ] Device check menampilkan status browser/kamera sebelum sesi.
- [ ] Tombol tes dan benchmark disabled sebelum informed consent dicentang.
- [ ] Latihan Go lalu konfirmasi No-Go selesai sebelum tombol tes/benchmark aktif.
- [ ] Checkbox consent dapat dinavigasi dengan keyboard.

## C. Kamera dan privasi

- [ ] Kamera ditolak: status berubah menjadi kamera tidak tersedia dan tes tetap dapat dimulai.
- [ ] Kamera diterima: preview lokal muncul tanpa audio.
- [ ] Saat kamera aktif, status gaze menampilkan `loading` lalu kualitas (`usable`/`limited`) jika model tersedia.
- [ ] Satu frame valid tidak ditampilkan sebagai gaze `usable`; quality gate memerlukan minimal 10 sampel valid dan coverage 50%.
- [ ] Saat tes berjalan, kamera tetap diproses melalui monitor lokal tersembunyi; tidak ada frame yang dikirim.
- [ ] Jika model gaze atau jaringan model gagal, status menjadi tidak tersedia dan CPT tetap bisa digunakan.
- [ ] Kamera tetap berada di browser; tidak ada request video/frame pada Network panel.
- [ ] Setelah sesi selesai, indikator kamera mati dan track stream berhenti.
- [ ] Menutup atau berpindah halaman juga menghentikan stream.

## D. CPT nyata

- [ ] Stimulus Go berwarna hijau dan instruksinya jelas.
- [ ] Stimulus No-Go berwarna merah dan instruksinya jelas.
- [ ] Space dan tombol layar menghasilkan respons yang sama.
- [ ] Go ditekan tercatat sebagai hit.
- [ ] Go tidak ditekan tercatat sebagai omission.
- [ ] No-Go ditekan tercatat sebagai commission.
- [ ] No-Go tidak ditekan tercatat sebagai correct rejection.
- [ ] Timer berhenti setelah 60 detik dan masuk ke hasil.
- [ ] Tombol `Akhiri sesi` mengakhiri sesi lebih awal dan menghasilkan status limited/insufficient yang jujur.
- [ ] Kamera dihentikan saat hasil muncul.

## E. Benchmark presentasi

- [ ] Consent dicentang.
- [ ] Profil Stable menghasilkan dashboard yang sama pada pengulangan.
- [ ] Profil Variable menghasilkan dashboard yang sama pada pengulangan.
- [ ] Benchmark memakai ID `DEMO-STABLE`/`DEMO-VARIABLE` dan label waktu `Fixture sintetis`.
- [ ] Header hasil menyebut `Demo sintetis` dan profilnya.
- [ ] Tidak ada klaim bahwa benchmark merupakan data pasien.

## F. Hasil dan laporan

- [ ] Median reaction time muncul atau menampilkan `0 ms` bila tidak ada hit.
- [ ] Hit rate, omission, dan commission sesuai fixture.
- [ ] Attention curve menampilkan enam blok atau tidak menyesatkan saat data sedikit.
- [ ] Status sesi membedakan usable, limited, dan insufficient.
- [ ] Glossary metrik terlihat.
- [ ] Metodologi dan batasan terlihat.
- [ ] `Cetak / simpan PDF` membuka dialog print.
- [ ] `Unduh data JSON` menghasilkan payload agregat tanpa video, frame, atau identitas langsung.
- [ ] Preview print tidak memuat navbar dan CTA aplikasi.
- [ ] PDF memuat disclaimer non-diagnostik.
- [ ] PDF memuat ID sesi anonim, waktu sesi, dan versi tes.
- [ ] Preview print menggunakan ukuran A4 kompak dan tetap muat satu halaman pada browser demo.
- [ ] Plot gaze hanya muncul jika quality gate berstatus `usable`.
- [ ] Perubahan posisi seluruh wajah tidak mengubah estimasi posisi iris relatif pada fixture tes.

## G. Analisis AI

- [ ] `/api/analyze` menerima payload valid dan merespons 200.
- [ ] Payload tidak valid merespons 400.
- [ ] Tanpa `GEMINI_API_KEY`, response memakai `local-guardrail-v1`.
- [ ] Dengan key, response Gemini tetap divalidasi dan diberi `is_diagnostic: false`.
- [ ] Timeout/error Gemini kembali ke fallback lokal.
- [ ] Payload hanya berisi metrik agregat, tanpa nama, foto, atau video.

## H. Rehearsal

- [ ] Demo benchmark selesai dalam kurang dari 45 detik.
- [ ] Demo tes nyata dijelaskan tanpa menyebut diagnosis.
- [ ] Tim dapat menjawab mengapa tes hanya 60 detik.
- [ ] Tim dapat menjelaskan correct rejection.
- [ ] Tim dapat menunjukkan fallback kamera dan AI.
- [ ] Video submission berdurasi 3–5 menit dan menampilkan integrasi AI/fallback.
