export type SessionHistoryEntry = {
  sessionId: string;
  userId: string;
  date: number;
  durationSeconds: number;
  testMode?: "clinical" | "quick";
  asrsTotalScore: number;
  asrsSignificant: boolean;
  medianRtMs: number | null;
  hitRate: number;
  omissions: number;
  commissions: number;
  dPrime?: number | null;
  gazeStatus: string;
};

export type UserTrends = {
  totalCompleted: number;
  avgMedianRt: number;
  avgHitRate: number;
};

export const SESSIONS_STORAGE_KEY = "oculicare_session_history";

export function saveSessionToHistory(
  list: SessionHistoryEntry[],
  entry: SessionHistoryEntry
): void {
  // unshift so newest is first
  list.unshift(entry);
}

export function getUserSessions(
  list: SessionHistoryEntry[],
  userId: string
): SessionHistoryEntry[] {
  return list.filter((s) => s.userId === userId);
}

export function calculateUserTrends(sessions: SessionHistoryEntry[]): UserTrends {
  if (!sessions.length) {
    return { totalCompleted: 0, avgMedianRt: 0, avgHitRate: 0 };
  }

  const validRt = sessions.map((s) => s.medianRtMs).filter((rt): rt is number => typeof rt === "number");
  const avgRt = validRt.length ? Math.round(validRt.reduce((a, b) => a + b, 0) / validRt.length) : 0;
  const avgHit = sessions.reduce((acc, s) => acc + s.hitRate, 0) / sessions.length;

  return {
    totalCompleted: sessions.length,
    avgMedianRt: avgRt,
    avgHitRate: Math.round(avgHit * 1000) / 1000,
  };
}

export function loadHistoryFromStorage(): SessionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function persistSessionToStorage(entry: SessionHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadHistoryFromStorage();
    existing.unshift(entry);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // quota exceeded or storage disabled
  }
}
