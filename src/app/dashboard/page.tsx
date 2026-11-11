"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getActiveUser, subscribeAuth, setActiveUser, type SafeUser } from "@/lib/auth/auth";
import {
  loadHistoryFromStorage,
  getUserSessions,
  calculateUserTrends,
  type SessionHistoryEntry,
} from "@/lib/storage/history";

function getActiveUserClient(): SafeUser | null {
  return getActiveUser();
}
function getActiveUserServer(): SafeUser | null {
  return null;
}

function getHistorySnapshot(): SessionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const active = getActiveUser();
  if (!active) return [];
  return getUserSessions(loadHistoryFromStorage(), active.id);
}
function getHistoryServerSnapshot(): SessionHistoryEntry[] {
  return [];
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeAuth, getActiveUserClient, getActiveUserServer);
  const sessions = useSyncExternalStore(subscribeAuth, getHistorySnapshot, getHistoryServerSnapshot);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = getActiveUser();
      if (!active) {
        router.push("/login");
      }
    }
  }, [router]);

  const handleLogout = () => {
    setActiveUser(null);
    router.push("/");
  };

  if (!user) {
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
      <div style={{ padding: "32px 0 24px" }}>
        <div className="status-pill">
          <span className="status-dot" /> Akun Terverifikasi Lokal
        </div>
        <h1 style={{ fontSize: "2.2rem", margin: "16px 0 8px", color: "var(--text-primary)" }}>
          Selamat datang, <em>{user.name}</em>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
          {user.email} · Terdaftar sejak {new Date(user.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
        </p>
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
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>📊</div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
              Belum ada riwayat sesi
            </h3>
            <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 20px", lineHeight: 1.5 }}>
              Jalankan tes refleks 60 detik pertamamu untuk mulai merekam data performa atensi dan mengunduh rujukan.
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
