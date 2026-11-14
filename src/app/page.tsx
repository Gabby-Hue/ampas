"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveUser, type SafeUser } from "@/lib/auth/auth";
import { ProfileIconButton } from "@/components/ProfileIconButton";

const principles = [
  ["01", "Performa, bukan diagnosis", "Lihat bagaimana perhatianmu bekerja dalam satu tugas singkat tanpa label medis."],
  ["02", "Privasi dari awal", "Kamera diproses di perangkat. Video dan frame tidak dikirim ke server."],
  ["03", "Hasil yang bisa dibawa", "Dapatkan ringkasan yang jelas untuk dibicarakan bersama tenaga profesional."],
];

export default function Home() {
  const [user, setUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    setUser(getActiveUser());
  }, []);

  return (
    <main className="site-shell">
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-links">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#privasi">Privasi</a>
          {user ? (
            <ProfileIconButton user={user} />
          ) : (
            <Link className="text-link" href="/login">Masuk</Link>
          )}
          <Link className="nav-cta" href="/screening">Mulai screening</Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="status-line">
            <span className="status-dot" /> Performa perhatian, dipahami lebih awal
          </p>
          <h1>
            Kenali pola fokusmu. <em>Dengan tenang.</em>
          </h1>
          <p className="hero-lede">
            OculiCare menggabungkan tugas perhatian singkat dan indikator kestabilan tatapan untuk memberi gambaran awal yang jujur, privat, dan mudah dibicarakan.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/screening">
              Mulai screening <span aria-hidden="true">→</span>
            </Link>
            <a className="text-link" href="#cara-kerja">
              Lihat cara kerja
            </a>
          </div>
          <p className="microcopy">Sekitar 90 detik · Kamera opsional · Bukan diagnosis</p>
        </div>

        <div className="hero-visual" aria-label="Pratinjau ringkasan hasil perhatian">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="focus-panel">
            <div className="panel-topline">
              <span>NEUROFOCUS / ILLUSTRATION</span>
              <span className="panel-live">LOCAL</span>
            </div>
            <div className="panel-heading">
              Your attention<br />
              <strong>has a rhythm.</strong>
            </div>
            <div className="signal-chart" aria-hidden="true">
              <span className="chart-line" />
              <span className="chart-point point-a" />
              <span className="chart-point point-b" />
              <span className="chart-point point-c" />
              <span className="chart-point point-d" />
            </div>
            <div className="panel-footer">
              <span>60 sec task</span>
              <span>example view</span>
            </div>
          </div>
          <div className="orbit-label label-top">
            Gaze quality<br />
            <strong>experimental</strong>
          </div>
          <div className="orbit-label label-bottom">
            Built for a<br />
            <strong>next step</strong>
          </div>
        </div>
      </section>

      <section className="trust-strip" id="privasi">
        <span>DESIGNED AROUND YOUR PRIVACY</span>
        <span className="trust-rule" />
        <span>ON-DEVICE PROCESSING</span>
        <span className="trust-rule" />
        <span>NO VIDEO STORAGE</span>
      </section>

      <section className="principles-section" id="cara-kerja">
        <div className="section-intro">
          <p className="section-kicker">A better first step</p>
          <h2>Informasi yang membantu, tanpa membuatmu takut.</h2>
        </div>
        <div className="principles-list">
          {principles.map(([number, title, copy]) => (
            <article className="principle-row" key={number}>
              <span className="principle-number">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>OculiCare NeuroFocus</span>
        <span>Screening performa perhatian · bukan diagnosis</span>
      </footer>
    </main>
  );
}
