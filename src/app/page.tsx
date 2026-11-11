"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getActiveUser, type SafeUser } from "@/lib/auth/auth";

const conditions = [
  {
    code: "DIAGNOSTIC CRITERIA 1",
    name: "ADHD Tipe Inatentif",
    sub: "Predominantly Inattentive Presentation (DSM-5 314.00)",
    symptoms: "Sering melamun (mind-wandering), kesulitan mempertahankan fokus pada materi monoton, mudah teralihkan rangsangan eksternal, dan kerap melupakan instruksi harian.",
    cptCorrelation: "Tercermin dari tingginya Omission Error (target hijau terlewat) dan variabilitas waktu reaksi (RTV) yang lebar.",
  },
  {
    code: "DIAGNOSTIC CRITERIA 2",
    name: "ADHD Tipe Hiperaktif-Impulsif",
    sub: "Predominantly Hyperactive-Impulsive (DSM-5 314.01)",
    symptoms: "Refleks motorik bergerak sebelum otak sadar mengevaluasi, ketidaksabaran saat menunggu giliran, kecenderungan menyela, dan gelisah motorik.",
    cptCorrelation: "Tercermin dari tingginya Commission Error (keliru menekan target merah yang seharusnya ditahan).",
  },
  {
    code: "NEURO-FATIGUE 3",
    name: "Digital Attention Fatigue & Brain Fog",
    sub: "Acquired Attention Fragmentation (Kelelahan Layar Akut)",
    symptoms: "Penurunan tajam kecepatan pemrosesan informasi setelah konsumsi konten video cepat (<60 detik) atau multitasking gawai berkepanjangan.",
    cptCorrelation: "Tercermin dari kurva atensi yang anjlok drastis pada paruh kedua pengujian (Vigilance Decrement).",
  },
  {
    code: "LIFESTYLE CO-FACTOR 4",
    name: "Cognitive Burnout & Sleep-Debt",
    sub: "Reversible Executive Dysfunction",
    symptoms: "Beban kerja tinggi atau defisit jam tidur yang meniru keluhan defisit konsentrasi namun dapat pulih setelah istirahat teratur.",
    cptCorrelation: "Tercermin dari waktu reaksi yang melambat secara menyeluruh (Median RT lambat > 500 ms) disertai dispersi fiksasi tatapan mata.",
  },
];

const comparisonData = [
  {
    condition: "ADHD Inatentif",
    dailySign: "Tugas terbengkalai, sering lupa, melamun",
    cptSign: "Omission Error Tinggi (>25%), RTV Lebar",
    gazeSign: "Fiksasi mata mudah keluar dari area target",
  },
  {
    condition: "ADHD Impulsif",
    dailySign: "Spontan, terburu-buru, refleks tak terkontrol",
    cptSign: "Commission Error Tinggi (>30%), Respon Prematur",
    gazeSign: "Tatapan reaktif sebelum stimulus stabil",
  },
  {
    condition: "Digital Brain Fog",
    dailySign: "Kepala terasa berat, sulit fokus setelah scrolling HP",
    cptSign: "Penurunan akurasi tajam di blok akhir (B5-B6)",
    gazeSign: "Kelelahan otot foveal, kedipan melambat",
  },
  {
    condition: "Kelelahan Kurang Tidur",
    dailySign: "Mengantuk, reaksi lamban, konsentrasi tumpul",
    cptSign: "Median Reaction Time melambat signifikan (>500 ms)",
    gazeSign: "Penutupan kelopak parsial, pergerakan iris lambat",
  },
];

export default function Home() {
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    setUser(getActiveUser());
  }, []);

  return (
    <main className="site-shell">
      {/* Navigation */}
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <a href="#spektrum-kondisi">Spektrum Gangguan</a>
          <a href="#matriks-komparasi">Matriks Triangulasi</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#privasi">Privasi & Etika</a>
        </div>
        <div className="nav-right-actions">
          <ThemeToggle />
          {user ? (
            <Link className="secondary-button" style={{ padding: "6px 14px", fontSize: "0.8rem" }} href="/dashboard">
              Dashboard ({user.name.split(" ")[0]})
            </Link>
          ) : (
            <>
              <Link className="text-link" href="/login">
                Masuk
              </Link>
              <Link className="primary-button" style={{ padding: "8px 16px", fontSize: "0.8rem" }} href="/register">
                Daftar Akun
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <span className="status-dot" /> Subtema 4: Inclusive Health & Well-being
          </div>
          <h1>
            Pahami batas <em>stamina fokusmu.</em> Secara objektif.
          </h1>
          <p className="hero-lede">
            Platform penapisan awal performa atensi dan triase neurobehavioral. Mengintegrasikan Continuous Performance
            Task (CPT) Go/No-Go terstandar, pelacakan okulomotorik on-device, dan kuesioner baku WHO ASRS v1.1.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/screening">
              Mulai Penapisan Terpandu (±90 Detik) <span>→</span>
            </Link>
            {user ? (
              <Link className="secondary-button" href="/dashboard">
                Lihat Histori Dashboard
              </Link>
            ) : (
              <Link className="secondary-button" href="/login">
                Masuk Untuk Simpan Riwayat
              </Link>
            )}
          </div>
          <p style={{ marginTop: "16px", fontSize: "0.74rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Instrumen Triase Awal (Termometer Atensi) · Bebas Biaya · 100% Pemrosesan Lokal Aman
          </p>
        </div>

        {/* Live Interactive Telemetry Card */}
        <div className="hero-card">
          <div className="card-header">
            <span>OKULOMOTORIK & REAKSI MOTORIK</span>
            <span className="badge-live">LIVE WASM TRACK</span>
          </div>

          <div style={{ margin: "16px 0 12px" }}>
            <div className="interactive-radar-canvas" aria-label="Simulasi radar fiksasi tatapan mata">
              <div className="radar-ring radar-ring-3" />
              <div className="radar-ring radar-ring-2" />
              <div className="radar-ring radar-ring-1" />
              <div className="radar-sweep" />
              <div className="radar-blip" style={{ top: "42%", left: "54%" }} />
              <div className="radar-blip" style={{ top: "52%", left: "47%", opacity: 0.6 }} />
              <div className="radar-blip" style={{ top: "46%", left: "50%", opacity: 0.9 }} />
              <div style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)" }}>
                FIKSASI PUPIL 30Hz: STABIL
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "14px 0" }}>
            <div style={{ background: "var(--surface-elevated)", padding: "12px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                MEDIAN REACTION TIME
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                384 <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>ms</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-teal)", fontWeight: 600 }}>Rentang Optimal</span>
            </div>

            <div style={{ background: "var(--surface-elevated)", padding: "12px", borderRadius: "8px", border: "1px solid var(--surface-border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                MOTOR INHIBITION
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", margin: "2px 0" }}>
                86.4%
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-teal)", fontWeight: 600 }}>Correct Rejection</span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--surface-border)", paddingTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
              <span>Kurva Ketahanan Fokus 60 Detik</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-teal)" }}>Blok 1 → Blok 6</span>
            </div>
            <div style={{ height: "40px", display: "flex", alignItems: "end", gap: "6px" }}>
              {[96, 92, 88, 85, 75, 68].map((v, i) => (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "end" }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${v}%`,
                      background: "linear-gradient(180deg, var(--accent-teal) 0%, rgba(16, 185, 129, 0.25) 100%)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip" id="privasi">
        <span>PRIVACY-BY-DESIGN</span>
        <span>•</span>
        <span>ZERO VIDEO INGESTION</span>
        <span>•</span>
        <span>WHO ASRS v1.1 VALIDATED</span>
        <span>•</span>
        <span>DETERMINISTIC PSYCHOMETRICS</span>
      </section>

      {/* 4 Conditions Deep Dive */}
      <section className="screening-content" id="spektrum-kondisi" style={{ padding: "64px 0" }}>
        <div style={{ maxWidth: "780px", marginBottom: "36px" }}>
          <div className="status-pill" style={{ marginBottom: "12px" }}>
            Kajian Klinis Diferensial
          </div>
          <h2 style={{ fontSize: "2.1rem", fontWeight: 700, margin: "0 0 14px", color: "var(--text-primary)" }}>
            Kenali 4 spektrum yang mendasari gangguan konsentrasi.
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Sulit fokus bukanlah satu vonis tunggal. Gejala yang dialami sehari-hari dapat berakar dari faktor
            neurobiologis bawaan maupun kelelahan gaya hidup digital. OculiCare memetakan perbedaannya secara terstruktur.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {conditions.map((item, idx) => (
            <article className="result-card" key={idx}>
              <div>
                <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)", fontWeight: 700, marginBottom: "4px" }}>
                  {item.code}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px", color: "var(--text-primary)" }}>
                  {item.name}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
                  {item.sub}
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 14px" }}>
                  {item.symptoms}
                </p>
              </div>
              <div style={{ borderTop: "1px solid var(--surface-border-subtle)", paddingTop: "12px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Deteksi di OculiCare: </strong>
                {item.cptCorrelation}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section className="screening-content" id="matriks-komparasi" style={{ padding: "36px 0 64px" }}>
        <div style={{ maxWidth: "780px", marginBottom: "28px" }}>
          <div className="status-pill" style={{ marginBottom: "12px" }}>
            Matriks Triangulasi
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
            Perbandingan Gejala Harian vs Parameter Tes CPT
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
            Bagaimana data perilaku nyata membedakan apakah kamu sedang lelah sesaat atau membutuhkan evaluasi profesional.
          </p>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid var(--surface-border)", borderRadius: "12px", background: "var(--surface)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)", background: "var(--surface-elevated)" }}>
                <th style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Spektrum Kondisi</th>
                <th style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Gejala Harian Subjektif</th>
                <th style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Karakteristik Respon CPT</th>
                <th style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Kestabilan Fiksasi Gaze</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr key={i} style={{ borderBottom: i === comparisonData.length - 1 ? "none" : "1px solid var(--surface-border-subtle)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--accent-teal)" }}>{row.condition}</td>
                  <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{row.dailySign}</td>
                  <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{row.cptSign}</td>
                  <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{row.gazeSign}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cara Kerja & Triangulasi Section */}
      <section className="screening-content" id="cara-kerja" style={{ padding: "36px 0 64px" }}>
        <div style={{ maxWidth: "780px", marginBottom: "28px" }}>
          <div className="status-pill" style={{ marginBottom: "12px" }}>
            Alur Penapisan Terstandar
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
            Bagaimana OculiCare Mengamati Fokusmu dalam 3 Langkah
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.55 }}>
            Dirancang tanpa gesekan teknis, melindungi privasi penuh, dan menghasilkan lembar rujukan dalam waktu kurang dari 2 menit.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div className="result-card">
            <div>
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)", fontWeight: 700, marginBottom: "4px" }}>
                LANGKAH 01
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                Validasi Keluhan Kronis (WHO ASRS)
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Enam pertanyaan saringan baku World Health Organization untuk memetakan apakah kesulitan konsentrasi terjadi secara persisten dalam 6 bulan terakhir.
              </p>
            </div>
          </div>

          <div className="result-card">
            <div>
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)", fontWeight: 700, marginBottom: "4px" }}>
                LANGKAH 02
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                Tes Refleks CPT Go/No-Go 60 Detik
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Stimulus foveal kilat 250 milidetik menguji kecepatan rem motorik otakmu saat target hijau dan merah muncul bergantian di lingkungan terkontrol.
              </p>
            </div>
          </div>

          <div className="result-card">
            <div>
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)", fontWeight: 700, marginBottom: "4px" }}>
                LANGKAH 03
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                Lembar Rujukan Klinis Siap Cetak
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Dapatkan dokumen rujukan PDF satu halaman A4 yang merangkum kurva kelelahan atensi, indeks kelengahan, dan catatan teknis untuk dokter atau psikolog.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
