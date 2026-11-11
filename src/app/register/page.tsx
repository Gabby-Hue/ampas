"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <main className="site-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">OC</span>
          <span>OculiCare</span>
        </Link>
        <div className="nav-links">
          <ThemeToggle />
          <Link className="text-link" href="/">
            Beranda
          </Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
        <div className="hero-card" style={{ width: "100%", maxWidth: "440px" }}>
          <div className="card-header">
            <span>REGISTRASI // AKUN PENGGUNA BARU</span>
            <span className="badge-live">DATA PRIVACY</span>
          </div>

          <h1 style={{ fontSize: "1.8rem", margin: "20px 0 6px" }}>Daftar Akun OculiCare</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 24px", lineHeight: 1.5 }}>
            Buat akun untuk memantau perkembangan stamina atensi dan menyimpan riwayat rujukan mandiri.
          </p>

          {error && (
            <div
              style={{
                background: "rgba(248, 81, 73, 0.12)",
                border: "1px solid rgba(248, 81, 73, 0.3)",
                color: "var(--coral-danger)",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                marginBottom: "18px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                htmlFor="name"
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                NAMA LENGKAP
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Budi Santoso"
                style={{
                  width: "100%",
                  height: "42px",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "8px",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                style={{
                  width: "100%",
                  height: "42px",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "8px",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                style={{
                  width: "100%",
                  height: "42px",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "8px",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <button type="submit" disabled={loading} className="primary-button" style={{ width: "100%", marginTop: "8px" }}>
              {loading ? "Mendaftarkan…" : "Daftar & Masuk ke Dashboard →"}
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--surface-border)",
              textAlign: "center",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
            }}
          >
            Sudah memiliki akun?{" "}
            <Link href="/login" style={{ color: "var(--accent-teal)", fontWeight: 600 }}>
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
