"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadUsersFromStorage, loginUser, setActiveUser } from "@/lib/auth/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const users = loadUsersFromStorage();
      const safeUser = loginUser(users, email, password);
      setActiveUser(safeUser);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat masuk.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="site-shell auth-page">
      <nav className="nav-wrap" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-center-menu">
          <Link href="/">Beranda</Link>
          <Link href="/screening">Mulai Tes</Link>
        </div>
      </nav>

      <div className="auth-grid">
        <aside className="auth-aside">
          <div className="eyebrow">Akun lokal</div>
          <h1>
            Catatan fokus yang bisa <em>dibawa ke konsultasi.</em>
          </h1>
          <p>
            Masuk untuk menyimpan hasil penapisan, membandingkan sesi dari waktu ke waktu, dan
            mengunduh ulang lembar rujukan tanpa mengulang tes.
          </p>
          <ul className="auth-points">
            <li>Riwayat sesi tersimpan di peramban ini, tanpa server database.</li>
            <li>Setiap sesi menyimpan metrik agregat, bukan rekaman kamera.</li>
            <li>Lembar rujukan A4 dapat dicetak ulang kapan saja dari dashboard.</li>
          </ul>
          <p className="auth-note">
            Data akun disimpan dengan localStorage pada perangkat ini. Jangan gunakan akun ini untuk
            data pasien nyata pada perangkat bersama.
          </p>
        </aside>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="status-pill">
            <span className="status-dot" />
            Masuk
          </div>
          <h2 id="login-title">Selamat datang kembali</h2>
          <p>Gunakan email dan kata sandi yang Anda daftarkan di perangkat ini.</p>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>

            <button type="submit" disabled={loading} className="primary-button" style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Memverifikasi..." : "Masuk ke dashboard"}
            </button>
          </form>

          <p className="auth-alt">
            Belum punya akun? <Link href="/register">Daftar sekarang</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
