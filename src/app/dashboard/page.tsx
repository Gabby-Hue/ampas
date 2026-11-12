"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileIconButton } from "@/components/ProfileIconButton";
import { getActiveUser, setActiveUser, type SafeUser } from "@/lib/auth/auth";
import {
  loadHistoryFromStorage,
  getUserSessions,
  calculateUserTrends,
  type SessionHistoryEntry,
} from "@/lib/storage/history";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char] ?? char;
  });
}

function downloadSessionJson(entry: SessionHistoryEntry): void {
  const payload = entry.exportPayload ?? {
    session_id: entry.sessionId,
    test_version: "2.1",
    test_mode: entry.testMode ?? "clinical",
    synthetic_demo: false,
    duration_seconds: entry.durationSeconds,
    asrs: {
      total_score: entry.asrsTotalScore,
      is_significant: entry.asrsSignificant,
    },
    cpt: {
      omissions: entry.omissions,
      commissions: entry.commissions,
      hit_rate: entry.hitRate,
      median_rt_ms: entry.medianRtMs,
      d_prime: entry.dPrime ?? null,
    },
    gaze: { status: entry.gazeStatus },
    legacy_entry: true,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${entry.sessionId.toLowerCase() || "oc-session"}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function printSessionReport(entry: SessionHistoryEntry): void {
  const report = window.open("", "_blank", "width=840,height=1000");
  if (!report) return;
  const cpt = entry.exportPayload?.cpt;
  const medianRt = cpt?.median_rt_ms ?? entry.medianRtMs;
  const hitRate = cpt?.hit_rate ?? entry.hitRate;
  const omissions = cpt?.omissions ?? entry.omissions;
  const commissions = cpt?.commissions ?? entry.commissions;
  const dPrime = cpt?.d_prime ?? entry.dPrime;
  const sessionDate = new Date(entry.date).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  report.document.write(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Lembar Rujukan ${escapeHtml(entry.sessionId)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #111827; line-height: 1.5; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
  .muted { color: #6b7280; }
  .rule { border-top: 1px solid #d1d5db; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  th { width: 42%; color: #374151; }
  .note { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 10.5px; }
</style>
</head>
<body>
  <h1>Lembar Rujukan Penapisan Atensi</h1>
  <div class="muted">OculiCare NeuroFocus · Tes versi 2.1</div>
  <div class="rule"></div>
  <table>
    <tr><th>ID Sesi (anonim)</th><td>${escapeHtml(entry.sessionId)}</td></tr>
    <tr><th>Waktu Sesi</th><td>${escapeHtml(sessionDate)}</td></tr>
    <tr><th>Durasi Tes</th><td>${escapeHtml(entry.durationSeconds)} detik</td></tr>
    <tr><th>Mode Tes</th><td>${escapeHtml(entry.testMode ?? "clinical")}</td></tr>
  </table>
  <h2>Hasil Kuesioner WHO ASRS v1.1</h2>
  <table>
    <tr><th>Total Skor Part A</th><td>${escapeHtml(entry.asrsTotalScore)}/24</td></tr>
    <tr><th>Kategori Skrining</th><td>${entry.asrsSignificant ? "Signifikan" : "Tidak signifikan"}</td></tr>
  </table>
  <h2>Metrik Continuous Performance Task</h2>
  <table>
    <tr><th>Median Reaction Time</th><td>${medianRt == null ? "Tidak tersedia" : `${escapeHtml(medianRt)} ms`}</td></tr>
    <tr><th>Akurasi Go (Hit Rate)</th><td>${Math.round(hitRate * 100)}%</td></tr>
    <tr><th>Omission</th><td>${escapeHtml(omissions)}</td></tr>
    <tr><th>Commission</th><td>${escapeHtml(commissions)}</td></tr>
    <tr><th>Sensitivitas d'</th><td>${dPrime == null ? "Tidak tersedia" : escapeHtml(dPrime)}</td></tr>
    <tr><th>Status Kualitas Gaze</th><td>${escapeHtml(entry.gazeStatus)}</td></tr>
  </table>
  <h2>Metodologi dan Keterbatasan</h2>
  <div class="note">
    Metrik dihitung dari tugas Go/No-Go terstruktur dan kuesioner baku WHO ASRS v1.1 Part A.
    Pengukuran berlangsung singkat dan dipengaruhi kualitas sensor, pencahayaan, serta kondisi sesi.
    Hasil ini bukan diagnosis ADHD atau gangguan mental lain, dan tidak menggantikan asesmen tenaga profesional.
    Bila keluhan konsentrasi menetap serta mengganggu aktivitas, konsultasikan dengan psikolog atau psikiater.
  </div>
</body>
</html>`);
  report.document.close();
  report.focus();
  report.print();
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const active = getActiveUser();
    if (!active) {
      router.push("/login");
    } else {
      setUser(active);
      const all = loadHistoryFromStorage();
      setSessions(getUserSessions(all, active.id));
      setIsReady(true);
    }
  }, [router]);

  const handleLogout = () => {
    setActiveUser(null);
    router.push("/");
  };

  if (!isReady || !user) {
    return (
      <main className="site-shell" style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
        Memverifikasi akun pengguna…
      </main>
    );
  }

  const trends = calculateUserTrends(sessions);

  return (
    <main className="site-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation */}
      <nav className="nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <Link href="/">Beranda</Link>
          <Link href="/screening">Mulai Tes</Link>
          <span className="status-pill" style={{ padding: "3px 8px", fontSize: "0.68rem" }}>
            DASHBOARD TERKUNCI
          </span>
        </div>
        <div className="nav-right-actions">
          <ThemeToggle />
          <ProfileIconButton user={user} />
          <button
            type="button"
            className="secondary-button"
            style={{ padding: "6px 14px", fontSize: "0.78rem" }}
            onClick={handleLogout}
          >
            Keluar Akun
          </button>
        </div>
      </nav>

      {/* Dashboard Header */}
      <div style={{ padding: "32px 0 24px", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
        <div
          className="icon-circle-btn"
          style={{ width: "60px", height: "60px", cursor: "default", borderColor: "var(--accent-teal)", color: "var(--accent-teal)" }}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <div className="status-pill">
            <span className="status-dot" /> Akun Terverifikasi Lokal
          </div>
          <h1 style={{ fontSize: "2.1rem", margin: "10px 0 6px", color: "var(--text-primary)" }}>
            Selamat datang, <em>{user.name}</em>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            {user.email} · Terdaftar sejak {new Date(user.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
          </p>
        </div>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="results-grid-cards">
        <div className="result-card">
          <div>
            <div className="result-card-title">TOTAL SESI PENAPISAN</div>
            <div className="result-card-value">{trends.totalCompleted} Sesi</div>
            <div className="result-card-desc">Jumlah tes Continuous Performance Task yang telah diselesaikan.</div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <Link
              className="primary-button"
              style={{ width: "100%", padding: "10px 16px", fontSize: "0.82rem" }}
              href="/screening"
            >
              Mulai Sesi Baru →
            </Link>
          </div>
        </div>

        <div className="result-card">
          <div>
            <div className="result-card-title">RATA-RATA REACTION TIME</div>
            <div className="result-card-value">{trends.avgMedianRt} ms</div>
            <div className="result-card-desc">
              Kecepatan rata-rata memproses dan merespons stimulus visual sepanjang sesi tes.
            </div>
          </div>
          <div style={{ marginTop: "16px", fontSize: "0.78rem", color: "var(--accent-teal)", fontFamily: "var(--font-mono)" }}>
            Rentang optimal: 320 s.d. 450 ms
          </div>
        </div>

        <div className="result-card">
          <div>
            <div className="result-card-title">KONSISTENSI GO ACCURACY</div>
            <div className="result-card-value">{Math.round(trends.avgHitRate * 100)}%</div>
            <div className="result-card-desc">
              Persentase keberhasilan menekan target hijau tepat waktu tanpa terlewat.
            </div>
          </div>
          <div style={{ marginTop: "16px", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {trends.avgHitRate >= 0.85 ? "Konsistensi Atensi Baik" : "Fluktuasi Terdeteksi"}
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <section style={{ padding: "16px 0 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Riwayat Penapisan & Lembar Rujukan
          </h2>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {sessions.length} CATATAN TERSIMPAN
          </span>
        </div>

        {sessions.length === 0 ? (
          <div
            className="hero-card"
            style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-secondary)" }}
          >
            <div
              className="icon-circle-btn"
              style={{ width: "52px", height: "52px", margin: "0 auto 14px", cursor: "default", color: "var(--accent-teal)" }}
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
              Belum ada riwayat sesi
            </h3>
            <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 20px", lineHeight: 1.5 }}>
              Jalankan sesi penapisan atensi pertamamu untuk mulai merekam data performa dan mengunduh lembar rujukan.
            </p>
            <Link className="primary-button" href="/screening">
              Jalankan Tes Sekarang →
            </Link>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--surface-border)",
              borderRadius: "12px",
              background: "var(--surface)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--surface-border)", background: "var(--surface-elevated)" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>ID Sesi</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Tanggal</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Skor WHO ASRS</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Median RT</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Akurasi Go</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Salah Pencet</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Status Gaze</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 700 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr
                    key={s.sessionId || idx}
                    style={{ borderBottom: idx === sessions.length - 1 ? "none" : "1px solid var(--surface-border-subtle)" }}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-teal)" }}>
                      {s.sessionId}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      {new Date(s.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>
                      {s.asrsTotalScore}/24{" "}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: s.asrsSignificant ? "var(--coral-danger)" : "var(--accent-teal)",
                          fontWeight: 600,
                        }}
                      >
                        ({s.asrsSignificant ? "Signifikan" : "Normal"})
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                      {s.medianRtMs ?? "-"} ms
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                      {Math.round(s.hitRate * 100)}%
                    </td>
                    <td style={{ padding: "12px 16px", color: s.commissions > 0 ? "var(--coral-danger)" : "var(--text-muted)" }}>
                      {s.commissions} Kali
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      <span className="status-pill" style={{ fontSize: "0.68rem", padding: "2px 8px" }}>
                        {s.gazeStatus}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                          onClick={() => printSessionReport(s)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                          onClick={() => downloadSessionJson(s)}
                        >
                          JSON
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
