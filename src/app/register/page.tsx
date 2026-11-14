"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadUsersFromStorage, registerUser, saveUsersToStorage, setActiveUser } from "@/lib/auth/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      const safeUser = registerUser(users, name, email, password);
      saveUsersToStorage(users);
      setActiveUser(safeUser);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat pendaftaran.");
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
          <div className="eyebrow">Akun baru</div>
          <h1>
            Satu tempat untuk <em>jejak fokus</em> Anda.
          </h1>
          <p>
            Akun menyimpan riwayat penapisan secara lokal sehingga Anda dapat membandingkan sesi,
            melihat perubahan stamina atensi, dan mencetak ulang lembar rujukan.
          </p>
          <ul className="auth-points">
            <li>Gratis, tanpa verifikasi email, dan dapat dipakai offline.</li>
            <li>Nama, email, dan kata sandi tidak dikirim ke server mana pun.</li>
            <li>Anda dapat menghapus riwayat kapan saja dari peramban ini.</li>
          </ul>
          <p className="auth-note">
            Kata sandi disimpan sebagai hash lokal untuk demo. Untuk penggunaan klinis nyata,
            gunakan penyedia autentikasi dengan enkripsi server.
          </p>
        </aside>

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="status-pill">
            <span className="status-dot" />
            Registrasi
          </div>
          <h2 id="register-title">Buat akun OculiCare</h2>
          <p>Isi data berikut untuk mulai menyimpan hasil penapisan di perangkat ini.</p>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Nama lengkap</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama yang tampil di dashboard"
              />
            </div>

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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>

            <button type="submit" disabled={loading} className="primary-button" style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Mendaftarkan..." : "Daftar dan masuk"}
            </button>
          </form>

          <p className="auth-alt">
            Sudah memiliki akun? <Link href="/login">Masuk di sini</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
