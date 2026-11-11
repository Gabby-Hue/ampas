"use client";

import { useSyncExternalStore } from "react";

const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => {
    themeListeners.delete(callback);
  };
}

function getThemeSnapshot(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("oculicare_theme");
  if (saved === "light" || saved === "dark") return saved;
  const currentAttr = document.documentElement.getAttribute("data-theme");
  return currentAttr === "light" ? "light" : "dark";
}

function getThemeServerSnapshot(): "dark" | "light" {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("oculicare_theme", next);
    } catch {
      // ignore
    }
    themeListeners.forEach((fn) => fn());
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
