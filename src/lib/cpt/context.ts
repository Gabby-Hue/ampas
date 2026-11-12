export type SleepDuration = "<6" | "6-8" | ">8";
export type ScreenExposure = "<2" | "2-5" | ">5";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type TestMode = "clinical" | "quick";

export type SubjectContext = {
  sleepHours: SleepDuration;
  caffeineRecent: boolean;
  screenTimeHours: ScreenExposure;
  timeOfDay: TimeOfDay;
  testMode: TestMode;
};

export function getDefaultTimeOfDay(): TimeOfDay {
  if (typeof window === "undefined") return "morning";
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function formatSubjectContextLabel(ctx: SubjectContext): string {
  const sleepLabel =
    ctx.sleepHours === "<6"
      ? "Tidur <6 jam (Kurang Tidur)"
      : ctx.sleepHours === "6-8"
      ? "Tidur 6–8 jam (Cukup)"
      : "Tidur >8 jam";
  const cafLabel = ctx.caffeineRecent ? "Kafein <2 jam terakhir" : "Tanpa kafein baru";
  const screenLabel =
    ctx.screenTimeHours === "<2"
      ? "Layar <2 jam"
      : ctx.screenTimeHours === "2-5"
      ? "Layar 2–5 jam"
      : "Layar >5 jam (Paparan Tinggi)";
  return `${sleepLabel} · ${cafLabel} · ${screenLabel}`;
}
