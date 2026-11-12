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
  <div class="muted">OculiCare NeuroFocus, tes versi 2.1</div>
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
        Memverifikasi akun pengguna...
      </main>
    );
  }

  const trends = calculateUserTrends(sessions);

  return (
    <main className="site-shell">
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <Link href="/">Beranda</Link>
          <Link href="/screening">Mulai Tes</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
        <div className="nav-right-actions">
          <ThemeToggle />
          <ProfileIconButton user={user} />
        </div>
      </nav>

      <header className="page-header">
        <div>
          <div className="eyebrow">Dashboard riwayat</div>
          <h1>
            Halo, <em>{user.name}</em>.
          </h1>
          <p>
            {user.email} · Terdaftar sejak{" "}
            {new Date(user.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="primary-button" href="/screening">
            Mulai sesi baru
          </Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </header>

      <section className="stat-strip" aria-label="Ringkasan performa">
        <div className="stat-cell">
          <div className="stat-label">Sesi selesai</div>
          <div className="stat-value">
            {trends.totalCompleted} <small>sesi</small>
          </div>
          <div className="stat-note">Jumlah tes Continuous Performance Task yang tersimpan.</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Rata-rata median RT</div>
          <div className="stat-value">
            {trends.avgMedianRt} <small>ms</small>
          </div>
          <div className="stat-note">Kecepatan rata-rata merespons stimulus visual antar sesi.</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Konsistensi akurasi Go</div>
          <div className="stat-value">
            {Math.round(trends.avgHitRate * 100)}
            <small>%</small>
          </div>
          <div className="stat-note">Persentase target hijau yang ditekan tepat waktu.</div>
        </div>
      </section>

      <section className="history-section">
        <div className="history-head">
          <h2>Riwayat penapisan</h2>
          <span className="history-count">
            {sessions.length} catatan tersimpan
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <h3>Belum ada riwayat sesi</h3>
            <p>
              Jalankan penapisan pertama untuk mulai merekam metrik performa dan mengunduh lembar
              rujukan. Hasil akan otomatis muncul di sini setelah sesi selesai.
            </p>
            <Link className="primary-button" href="/screening">
              Jalankan tes sekarang
            </Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID sesi</th>
                  <th>Tanggal</th>
                  <th>WHO ASRS</th>
                  <th>Median RT</th>
                  <th>Akurasi Go</th>
                  <th>Salah pencet</th>
                  <th>Status gaze</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr key={s.sessionId || idx}>
                    <td className="cell-id" data-label="ID sesi">
                      {s.sessionId}
                    </td>
                    <td data-label="Tanggal">
                      {new Date(s.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td data-label="WHO ASRS">
                      {s.asrsTotalScore}/24{" "}
                      <span style={{ marginLeft: 4, color: s.asrsSignificant ? "var(--danger)" : "var(--success)", fontSize: "0.74rem" }}>
                        {s.asrsSignificant ? "Signifikan" : "Normal"}
                      </span>
                    </td>
                    <td className="cell-num" data-label="Median RT">
                      {s.medianRtMs ?? "-"} ms
                    </td>
                    <td className="cell-num" data-label="Akurasi Go">
                      {Math.round(s.hitRate * 100)}%
                    </td>
                    <td data-label="Salah pencet" style={{ color: s.commissions > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                      {s.commissions} kali
                    </td>
                    <td data-label="Status gaze">
                      <span
                        className={`status-tag ${
                          s.gazeStatus === "usable"
                            ? ""
                            : s.gazeStatus === "unavailable"
                            ? "is-danger"
                            : "is-warning"
                        }`}
                      >
                        {s.gazeStatus}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => printSessionReport(s)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
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

      <footer className="site-footer">
        <div>
          <strong>OculiCare NeuroFocus</strong>
          <div>Ringkasan penapisan performa, bukan diagnosis medis.</div>
        </div>
        <div>{sessions.length} sesi tersimpan di perangkat ini.</div>
      </footer>
    </main>
  );
}
