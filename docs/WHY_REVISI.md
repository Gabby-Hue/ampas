# Mengapa PRD OculiCare Direvisi

Dokumen ini menjelaskan alasan perubahan dari `PRD_OculiCare_NeuroFocus.md` versi awal ke `PRD_OculiCare_NeuroFocus_v2.md`.

## Ringkasan

PRD awal memiliki ide yang kuat untuk lomba: CPT, kamera browser, pemrosesan lokal, visualisasi, dan ringkasan AI. Namun beberapa bagian menyatakan kemampuan klinis yang belum didukung validasi dan menetapkan scope teknis yang terlalu besar untuk satu minggu hacking.

PRD revisi mempertahankan inti produk, lalu mengubah positioning menjadi **attention performance screening dan early referral aid**. Dengan framing ini, produk tetap inovatif tetapi lebih dapat dipertanggungjawabkan dalam penilaian dan sesi Q&A.

## Perubahan utama

| Bagian awal | Revisi | Alasan |
|---|---|---|
| “Acquired Attention Deficit” dan “brain fog” sebagai konteks utama | Digital attention fatigue dan kesulitan performa perhatian | Istilah awal mudah terbaca sebagai diagnosis atau klaim kausal yang belum dibuktikan. |
| Pre-screening ADHD berbasis 60 detik | Skrining performa tugas perhatian | ADHD tidak dapat disimpulkan dari satu sesi singkat; diagnosis membutuhkan evaluasi profesional dan konteks perkembangan. |
| “Ocular biometrics” dan biomarker neurofisiologis | Relative gaze stability dan gaze-quality | Kamera webcam dan MediaPipe tidak cukup untuk mendukung klaim biomarker klinis universal. |
| Microsaccadic jitter rate | Dihapus dari metrik klinis MVP | Microsaccade memerlukan pengukuran presisi dan frame rate yang lebih tinggi daripada webcam umum. |
| Ambang GDI dalam pixel untuk normal/ADHD | Threshold teknis kualitas data, tanpa label diagnostik | Pixel bergantung pada perangkat, jarak, resolusi, pencahayaan, dan kalibrasi. |
| Gemini menghasilkan skor dan interpretasi DSM-5 | Kode deterministik menghitung skor; AI hanya menjelaskan | Mencegah LLM menjadi pengambil keputusan medis dan membuat hasil dapat direproduksi. |
| “Medical Intelligence” | AI explanation layer dengan guardrail | Nama baru lebih jujur terhadap fungsi aktual dan lebih mudah dipertanggungjawabkan. |
| Kamera wajib dalam alur | CPT tetap dapat berjalan tanpa kamera | Memperbaiki aksesibilitas dan memastikan fitur inti tidak gagal saat permission atau sensor bermasalah. |
| Benchmark sandbox tersembunyi | Demo Mode berlabel data sintetis | Transparansi penting untuk etika dan mencegah kesan manipulasi hasil di depan juri. |
| Supabase sebagai opsi penyimpanan sesi | Tidak wajib; opt-in dan anonim bila dipakai | Data kesehatan/perhatian perlu diminimalkan selama MVP. |
| Target teknis 30 FPS dan latensi AI sangat ketat | Acceptance criteria berbasis graceful degradation dan fallback | Reliabilitas lomba lebih penting daripada angka performa yang sulit dijamin di semua perangkat. |
| Scope mencakup banyak fitur klinis sekaligus | Prioritas CPT, quality gate, dashboard, PDF, dan demo | Satu minggu hacking membutuhkan MVP yang selesai, dapat dijalankan, dan mudah diverifikasi. |

## Mengapa revisi ini meningkatkan peluang lomba

### 1. Lebih kuat pada problem-solution fit

Masalahnya menjadi konkret: pengguna membutuhkan informasi awal tentang performa perhatian dan ringkasan yang dapat dibawa ke tenaga profesional. Produk tidak menjanjikan diagnosis yang tidak dapat diberikan oleh MVP.

### 2. Inovasi tetap terlihat

Nilai inovasi berpindah dari klaim “alat diagnosis berbasis biomarker” ke integrasi yang lebih defensible: CPT browser, gaze-quality on-device, privacy-by-design, dan penjelasan AI terstruktur.

### 3. Lebih aman saat Q&A

Tim dapat menjawab dengan jelas bahwa aplikasi bukan alat diagnosis, belum divalidasi klinis, dan memisahkan skor deterministik dari penjelasan AI. Ini mengurangi risiko juri menemukan kontradiksi antara klaim dan implementasi.

### 4. Lebih realistis dibangun

CPT dibuat sebagai fitur inti. Vision, AI, dan PDF memiliki fallback sehingga kegagalan kamera atau internet tidak menghancurkan demo.

### 5. Lebih sesuai dengan penilaian etika

Consent kamera, minimisasi data, tidak menyimpan video, label data sintetis, schema AI, dan disclaimer terlihat sebagai fitur produk, bukan catatan tambahan.

## Hal yang sengaja tidak diubah

- Nama dan arah umum OculiCare NeuroFocus.
- Paradigma Go/No-Go.
- Durasi tes sekitar 60 detik.
- Pemrosesan kamera secara lokal.
- Dashboard visual dan ekspor PDF.
- Penggunaan AI sebagai fitur penjelasan.
- Fokus pada akses kesehatan dan kesejahteraan masyarakat.

## Prinsip keputusan untuk implementasi

Jika suatu fitur meningkatkan efek demo tetapi memperbesar klaim klinis tanpa validasi, fitur tersebut harus diturunkan menjadi indikator teknis atau ditunda. Jika kamera, AI, atau koneksi gagal, pengguna tetap harus bisa menyelesaikan bagian CPT dan menerima hasil yang jujur tentang keterbatasan data.

