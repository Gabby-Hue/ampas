# OculiCare NeuroFocus - Total Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformasi total website OculiCare NeuroFocus mencakup: Landing Page 4 Spektrum Gangguan Atensi, Sistem Autentikasi & Dashboard Riwayat Sesi, Gerbang Integritas Tes 4 Syarat (Kamera, Fullscreen, Tab-Lock, Recording Ready), serta Dark/Light Mode Theme Engine dengan standar Anti-Slop (No Em-Dash, No Buzzwords, WCAG AA Contrast, Full Dynamic Width).

**Architecture:** Modul murni client-first dengan persistensi state terstruktur (`/src/lib/auth`, `/src/lib/storage`, `/src/lib/cpt`), Next.js App Router dengan route `/`, `/login`, `/register`, `/dashboard`, `/screening`, serta utilitas styling CSS variables dengan dukungan mode gelap dan terang.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, MediaPipe Tasks Vision (Offline WASM), Node.js native test runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-11-11-oculicare-total-refactor-design.md`

## Global Constraints
- Dilarang menggunakan karakter em dash (`—`) pada seluruh UI copywriting (ganti dengan koma, titik, titik dua, atau kurung).
- Dilarang menggunakan buzzwords AI generik ('revolutionary', 'AI-powered', 'seamless', dll).
- Seluruh elemen interaktif wajib berfungsi nyata atau memiliki aksi terarah (tidak ada dead controls atau ghost links).
- Seluruh teks wajib memenuhi standar kontras WCAG AA (minimal 4.5:1 untuk normal text, 3:1 untuk large text).
- Layout layar desktop wajib dinamis 100% tanpa batas `max-width` kaku di bagian samping.

## Review Focus
1. User dapat beralih tema (Dark / Light Mode) secara instan tanpa glitch rendering.
2. Form registrasi dan login memvalidasi email dan password serta menyimpan sesi pengguna aktif.
3. Setelah menyelesaikan sesi tes, data sesi tersimpan otomatis ke dashboard riwayat pengguna.
4. Di halaman `/screening`, tes tidak dapat dimulai sebelum 4 syarat integritas (Kamera, Fullscreen, Focus Shield, Recording Ready) terpenuhi.
5. Jika pengguna keluar dari Fullscreen atau berpindah tab saat tes berlangsung, tes otomatis dijeda dan menampilkan dialog peringatan.

---

### Task 1: Auth & User Session Engine (TDD)

**Files:**
- Create: `src/lib/auth/auth.ts`
- Test: `src/lib/auth/auth.test.mjs`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement Auth utilities (register, login, getActiveUser, logout)**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Session History & Dashboard Storage Engine (TDD)

**Files:**
- Create: `src/lib/storage/history.ts`
- Test: `src/lib/storage/history.test.mjs`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement History storage utilities (saveSession, getUserSessions, deleteSession)**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Theme Engine (Dual Dark & Light Mode Support)

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Implement CSS Variables for Dark and Light Mode in `globals.css`**
- [ ] **Step 2: Implement `ThemeToggle` component with localStorage persistence**
- [ ] **Step 3: Wire theme provider attribute to `src/app/layout.tsx`**
- [ ] **Step 4: Run build & lint to verify zero regressions**
- [ ] **Step 5: Commit**

---

### Task 4: Educational Landing Page Refactor (`/`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement Comprehensive 4-Condition Spectrum Section (Inattentive ADHD, Hyperactive ADHD, Digital Brain Fog, Burnout)**
- [ ] **Step 2: Implement Comparison Matrix (Symptoms vs CPT Indicators)**
- [ ] **Step 3: Add Navigation CTAs to `/screening`, `/login`, and `/dashboard`**
- [ ] **Step 4: Check copywriting compliance (Anti-Slop: No Em-Dash, No Buzzwords)**
- [ ] **Step 5: Verify build & commit**

---

### Task 5: Auth Pages: Login & Register (`/login` & `/register`)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Build `/register` form with validation and redirect to dashboard**
- [ ] **Step 2: Build `/login` form with validation and error state**
- [ ] **Step 3: Verify keyboard navigation, accessibility, and focus states**
- [ ] **Step 4: Commit**

---

### Task 6: User Dashboard & History Review Page (`/dashboard`)

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Build dashboard header with user profile badge and logout button**
- [ ] **Step 2: Build metrics summary cards (total sessions, average reaction time, consistency rate)**
- [ ] **Step 3: Build interactive session history table with date, ASRS score, CPT metrics, and re-download actions**
- [ ] **Step 4: Commit**

---

### Task 7: Strict Test Integrity Gate on Screening (`/screening`)

**Files:**
- Modify: `src/app/screening/page.tsx`

- [ ] **Step 1: Implement 4-Step Pre-Flight Integrity Checklist (Camera Active, Fullscreen Enforced, Tab-Shield Active, System Ready)**
- [ ] **Step 2: Implement Window Blur & Visibility Change detection to pause test on tab switch**
- [ ] **Step 3: Auto-save completed test session to current user's history in Dashboard storage**
- [ ] **Step 4: Verify full test flow, unit tests, and commit**

---

### Task 8: Verification & LOGICODIX Delivery Gate

- [ ] **Step 1: Run all unit tests (`npm test`) -> Ensure 100% pass**
- [ ] **Step 2: Run ESLint (`npm run lint`) -> Ensure 0 errors, 0 warnings**
- [ ] **Step 3: Run production build (`npm run build`) -> Ensure clean build**
- [ ] **Step 4: Push to branch `neil` and `main` on GitHub**
