import Link from "next/link";

const principles = [
  {
    code: "TRIANGULASI DATA",
    title: "WHO ASRS v1.1 + Objective Go/No-Go CPT",
    desc: "Menggabungkan pengakuan gejala 6 bulan terakhir dengan tes refleks motorik terstandar. Bukan sekadar kuesioner ingatan, melainkan observasi performa aktual.",
  },
  {
    code: "PRIVASI MUTLAK (ON-DEVICE)",
    title: "Zero Video Ingestion & WASM Isolation",
    desc: "Kamera opsional hanya memproses koordinat relatif iris langsung di RAM peramban via WebAssembly. Nol frame atau rekaman video yang meninggalkan perangkatmu.",
  },
  {
    code: "EARLY REFERRAL AID",
    title: "Lembar Rujukan Medis Siap Bawa (PDF 1 Halaman)",
    desc: "Hasil dipisahkan menjadi dua bahasa: wawasan ramah untuk pemahaman mandiri dan lembar metrik formal untuk memfasilitasi wawancara dengan dokter/psikolog.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-links">
          <a href="#metodologi">Metodologi</a>
          <a href="#privasi">Privasi & Etika</a>
          <span className="nav-badge">v2.0 Hacking MVP</span>
          <Link className="primary-button" style={{ padding: "8px 16px", fontSize: "0.8rem" }} href="/screening">
            Mulai Penapisan →
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <span className="status-dot" /> Subtema 4: Inclusive Health & Well-being
          </div>
          <h1>
            Pahami batas <em>stamina fokusmu.</em> Secara objektif.
          </h1>
          <p className="hero-lede">
            Instrumen penapisan awal performa perhatian neurobehavioral. Mengintegrasikan Continuous Performance Task
            (CPT) 60 detik, pelacakan okulomotorik on-device, dan kuesioner baku WHO ASRS v1.1.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/screening">
              Mulai Sesi Screening (±90 Detik) <span>→</span>
            </Link>
            <a className="secondary-button" href="#metodologi">
              Pelajari Arsitektur Ilmiah
            </a>
          </div>
          <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Bukan alat diagnosis klinis · Bebas biaya · Pemrosesan lokal aman
          </p>
        </div>

        <div className="hero-card">
          <div className="card-header">
            <span>TELEMETRY_SAMPLE // RUNTIME_PREVIEW</span>
            <span className="badge-live">LOCAL WASM</span>
          </div>
          <div style={{ margin: "24px 0 16px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Psychomotor Speed (Median RT)
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
              384 <span style={{ fontSize: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>ms</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--accent-teal)", fontFamily: "var(--font-mono)" }}>
              Inhibitory Control: 86.4% Correct Rejection
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--surface-border)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
              <span>Attention Fatigue Curve</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>B1 → B6</span>
            </div>
            <div style={{ height: "48px", display: "flex", alignItems: "end", gap: "6px" }}>
              {[95, 92, 88, 85, 76, 68].map((v, i) => (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "end" }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${v}%`,
                      background: "linear-gradient(180deg, #00d2b4 0%, rgba(0, 210, 180, 0.3) 100%)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" id="privasi">
        <span>PRIVACY-BY-DESIGN</span>
        <span>•</span>
        <span>ZERO VIDEO INGESTION</span>
        <span>•</span>
        <span>WHO ASRS v1.1 VALIDATED</span>
        <span>•</span>
        <span>DETERMINISTIC PSYCHOMETRICS</span>
      </section>

      <section className="principles-section" id="metodologi">
        <div>
          <div className="status-pill" style={{ marginBottom: "12px" }}>
            Standar Triangulasi
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 16px", color: "#ffffff" }}>
            Mengapa satu tes saja tidak pernah cukup?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Kelemahan terbesar aplikasi penapisan online saat ini adalah overclaim: mengklaim bisa membaca ADHD hanya
            dari 1 kuesioner ingatan atau 1 menit refleks visual. OculiCare memecahkan masalah ini dengan menghubungkan
            tiga pilar data objektif.
          </p>
        </div>

        <div className="principles-list">
          {principles.map((p, idx) => (
            <article className="principle-item" key={idx}>
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)", fontWeight: 700, marginBottom: "6px" }}>
                {p.code}
              </div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--surface-border-subtle)",
          padding: "24px 0 36px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>OCULICARE NEUROFOCUS // LOGICODIX 2026 EDITION</span>
        <span>INSTRUMEN SKRINING AWAL · BUKAN DIAGNOSIS MEDIS</span>
      </footer>
    </main>
  );
}
