"use client";

import Link from "next/link";
import type { SafeUser } from "@/lib/auth/auth";

export function ProfileIconButton({ user }: { user: SafeUser }) {
  return (
    <Link
      href="/dashboard"
      className="icon-circle-btn"
      title={`Profil & Dashboard: ${user.name}`}
      aria-label={`Buka Dashboard Profil ${user.name}`}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </Link>
  );
}
