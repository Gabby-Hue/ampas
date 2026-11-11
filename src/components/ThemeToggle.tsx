"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;
function getThemeClient(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("oculicare_theme");
  return saved === "light" ? "light" : "dark";
}
function getThemeServer(): "dark" | "light" {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(emptySubscribe, getThemeClient, getThemeServer);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("oculicare_theme", next);
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Ganti ke mode ${theme === "dark" ? "terang" : "gelap"}`}
      title={`Mode saat ini: ${theme === "dark" ? "Gelap" : "Terang"}`}
    >
      <span aria-hidden="true">{theme === "dark" ? "🌙 Gelap" : "☀️ Terang"}</span>
    </button>
  );
}
