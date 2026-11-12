"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileIconButton } from "@/components/ProfileIconButton";
import { getActiveUser, type SafeUser } from "@/lib/auth/auth";

const conditions = [
  {
    code: "Spektrum 01",
    name: "ADHD Tipe Inatentif",
    sub: "Predominantly Inattentive Presentation (DSM-5 314.00)",
    symptoms: "Sering melamun, kesulitan mempertahankan fokus pada materi monoton, mudah teralihkan rangsangan eksternal, dan kerap melupakan instruksi harian.",
    cptCorrelation: "Omission error tinggi (target hijau terlewat) dan variabilitas waktu reaksi yang lebar.",
  },
  {
    code: "Spektrum 02",
    name: "ADHD Tipe Hiperaktif-Impulsif",
    sub: "Predominantly Hyperactive-Impulsive (DSM-5 314.01)",
    symptoms: "Refleks motorik bergerak sebelum otak sadar mengevaluasi, tidak sabar menunggu giliran, cenderung menyela, dan gelisah motorik.",
    cptCorrelation: "Commission error tinggi, yaitu keliru menekan target merah yang seharusnya ditahan.",
  },
  {
    code: "Spektrum 03",
    name: "Digital Attention Fatigue",
    sub: "Acquired Attention Fragmentation (Kelelahan Layar Akut)",
    symptoms: "Penurunan tajam kecepatan pemrosesan setelah konsumsi video pendek di bawah 60 detik atau multitasking gawai berkepanjangan.",
    cptCorrelation: "Kurva atensi anjlok pada paruh kedua pengujian (vigilance decrement).",
  },
  {
    code: "Spektrum 04",
    name: "Cognitive Burnout & Sleep-Debt",
    sub: "Reversible Executive Dysfunction",
    symptoms: "Beban kerja tinggi atau defisit jam tidur yang meniru keluhan defisit konsentrasi, namun dapat pulih setelah istirahat teratur.",
    cptCorrelation: "Median reaction time melambat menyeluruh (di atas 500 ms) disertai dispersi fiksasi tatapan.",
  },
];

const comparisonData = [
  {
    condition: "ADHD Inatentif",
    dailySign: "Tugas terbengkalai, sering lupa, melamun",
    cptSign: "Omission error tinggi (>25%), RTV lebar",
    gazeSign: "Fiksasi mata mudah keluar dari area target",
  },
  {
    condition: "ADHD Impulsif",
    dailySign: "Spontan, terburu-buru, refleks tak terkontrol",
    cptSign: "Commission error tinggi (>30%), respons prematur",
    gazeSign: "Tatapan reaktif sebelum stimulus stabil",
  },
  {
    condition: "Digital Brain Fog",
    dailySign: "Kepala berat, sulit fokus setelah menggulir layar",
    cptSign: "Akurasi turun tajam di blok akhir (B5-B6)",
    gazeSign: "Kelelahan otot foveal, kedipan melambat",
  },
  {
    condition: "Kelelahan Kurang Tidur",
    dailySign: "Mengantuk, reaksi lamban, konsentrasi tumpul",
    cptSign: "Median reaction time melambat (>500 ms)",
    gazeSign: "Penutupan kelopak parsial, pergerakan iris lambat",
  },
];

const focusCurve = [96, 92, 88, 85, 75, 68];

export default function Home() {
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    setUser(getActiveUser());
  }, []);

  return (
    <main className="site-shell">
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <a href="#spektrum-kondisi">Spektrum</a>
          <a href="#matriks-komparasi">Matriks</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#privasi">Privasi</a>
        </div>
        <div className="nav-right-actions">
          <ThemeToggle />
          {user ? (
            <ProfileIconButton user={user} />
          ) : (
            <>
              <Link className="text-link" href="/login">
                Masuk
              </Link>
              <Link className="primary-button nav-cta" href="/register">
                Buat Akun
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">Subtema 4, Inclusive Health &amp; Well-being</div>
          <h1>
            Pahami batas <em>stamina fokusmu</em>, secara objektif.
          </h1>
          <p className="hero-lede">
            Penapisan awal performa atensi yang menggabungkan Continuous Performance Task Go/No-Go,
            pelacakan okulomotorik on-device, dan kuesioner baku WHO ASRS v1.1. Hasilnya berupa
            ringkasan terukur untuk dibawa ke konsultasi profesional.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/screening">
              Mulai Penapisan
            </Link>
            {user ? (
              <Link className="secondary-button" href="/dashboard">
                Lihat Riwayat Sesi
              </Link>
            ) : (
              <Link className="secondary-button" href="/login">
                Masuk untuk Simpan Riwayat
              </Link>
            )}
          </div>
          <p className="hero-meta">
            Tes 6 menit atau mode cepat, tanpa biaya, 100% diproses di peramban. Bukan alat diagnosis.
          </p>
        </div>

        <aside className="hero-card" aria-label="Contoh keluaran sesi penapisan">
          <div className="card-header">
            <span>Contoh keluaran sesi</span>
            <span className="badge-live">Data sintetis</span>
          </div>

          <div className="interactive-radar-canvas" aria-label="Ilustrasi peta fiksasi tatapan mata">
            <div className="radar-ring radar-ring-3" />
            <div className="radar-ring radar-ring-2" />
            <div className="radar-ring radar-ring-1" />
            <div className="radar-sweep" />
            <div className="radar-blip" style={{ top: "42%", left: "54%" }} />
            <div className="radar-blip" style={{ top: "52%", left: "47%", opacity: 0.6 }} />
            <div className="radar-blip" style={{ top: "46%", left: "50%", opacity: 0.9 }} />
          </div>

          <div className="readout-grid">
            <div className="readout">
              <div className="readout-label">Median RT</div>
              <div className="readout-value">
                384 <span>ms</span>
              </div>
              <div className="readout-note">
                <strong>Dalam rentang</strong> sesi tenang
              </div>
            </div>
            <div className="readout">
              <div className="readout-label">Inhibisi motor</div>
              <div className="readout-value">86,4%</div>
              <div className="readout-note">
                <strong>Penolakan benar</strong> target merah
              </div>
            </div>
          </div>

          <div>
            <div className="curve-caption">
              <span>Kurva ketahanan fokus, 6 blok</span>
              <span>Blok 1 ke 6</span>
            </div>
            <div className="mini-bars" aria-hidden="true">
              {focusCurve.map((value, index) => (
                <span key={index} style={{ height: `${Math.round(value * 0.5)}px` }} />
              ))}
            </div>
            <p className="specimen-note">
              Visual contoh, bukan hasil pengguna. Metrik sebenarnya dihitung dari respons dan kualitas sensor sesi Anda.
            </p>
          </div>
        </aside>
      </section>

      <section className="trust-strip" id="privasi" aria-label="Prinsip produk">
        <span>Privasi by design</span>
        <span>Tidak ada video yang diunggah</span>
        <span>WHO ASRS v1.1 tervalidasi</span>
        <span>Psikometri deterministik</span>
      </section>

      <section className="section" id="spektrum-kondisi">
        <div className="section-head">
          <div>
            <div className="status-pill">
              <span className="status-dot" />
              Kajian klinis diferensial
            </div>
            <h2>Empat spektrum di balik kesulitan konsentrasi.</h2>
          </div>
          <p>
            Sulit fokus bukan satu vonis tunggal. Gejala harian bisa berakar pada faktor neurobiologis
            bawaan maupun kelelahan gaya hidup digital. OculiCare memetakan perbedaannya secara
            terstruktur, tanpa menyimpulkan diagnosis.
          </p>
        </div>

        <div className="spectrum-list">
          {conditions.map((item, index) => (
            <article className="spectrum-row" key={item.name}>
              <div className="spectrum-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3 className="spectrum-name">{item.name}</h3>
                <p className="spectrum-sub">{item.sub}</p>
              </div>
              <p className="spectrum-copy">{item.symptoms}</p>
              <p className="spectrum-detect">
                <strong>Jejak di tes</strong>
                {item.cptCorrelation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="matriks-komparasi">
        <div className="section-head">
          <div>
            <div className="status-pill">
              <span className="status-dot" />
              Matriks triangulasi
            </div>
            <h2>Gejala harian dibanding parameter tes.</h2>
          </div>
          <p>
            Bagaimana data perilaku nyata membantu membedakan kelelahan sesaat dari pola yang layak
            dievaluasi bersama tenaga profesional.
          </p>
        </div>

        <div className="matrix-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Spektrum kondisi</th>
                <th>Gejala harian subjektif</th>
                <th>Karakteristik respons CPT</th>
                <th>Kestabilan fiksasi gaze</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row) => (
                <tr key={row.condition}>
                  <td>{row.condition}</td>
                  <td data-label="Gejala harian">{row.dailySign}</td>
                  <td data-label="Respons CPT">{row.cptSign}</td>
                  <td data-label="Fiksasi gaze">{row.gazeSign}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" id="cara-kerja">
        <div className="process-grid">
          <div className="process-intro">
            <div className="status-pill" style={{ marginBottom: 16 }}>
              <span className="status-dot" />
              Alur penapisan terstandar
            </div>
            <h2>Tiga lapis pengukuran, satu ringkasan.</h2>
            <p>
              Protokol lingkungan terkontrol, pemrosesan on-device, dan lembar rujukan yang bisa
              dibaca dokter tanpa kehilangan konteks.
            </p>
          </div>

          <div className="process-list">
            <article className="process-step">
              <div>
                <h3>Validasi keluhan kronis</h3>
                <p>
                  Enam pertanyaan saringan WHO ASRS v1.1 memetakan apakah kesulitan konsentrasi
                  terjadi secara persisten dalam enam bulan terakhir.
                </p>
              </div>
            </article>
            <article className="process-step">
              <div>
                <h3>Continuous Performance Task</h3>
                <p>
                  Stimulus foveal 250 milidetik menguji ketahanan fokus pada blok monoton hingga
                  kontrol impuls motorik, dengan metrik omission, commission, dan variabilitas waktu reaksi.
                </p>
              </div>
            </article>
            <article className="process-step">
              <div>
                <h3>Lembar rujukan siap cetak</h3>
                <p>
                  Ringkasan A4 satu halaman berisi metrik, kualitas data, metodologi, dan keterbatasan
                  untuk dibawa ke psikolog atau psikiater.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>OculiCare NeuroFocus</strong>
          <div>LOGICODIX 2026, instrumen skrining awal, bukan diagnosis medis.</div>
        </div>
        <div>
          <Link className="text-link" href="/screening">
            Mulai penapisan
          </Link>
        </div>
      </footer>
    </main>
  );
}
