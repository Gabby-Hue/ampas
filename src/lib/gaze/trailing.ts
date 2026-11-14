export type TrailingSample = {
  timeMs: number;
  targetX: number;
  targetY: number;
  gazeX: number;
  gazeY: number;
  valid: boolean;
};

export type TrailingMetrics = {
  samplesCount: number;
  accuracyPercent: number;
  meanDeviation: number;
  intrusiveSaccades: number;
  status: "optimal" | "moderate_lag" | "high_dispersion" | "insufficient_data";
  statusLabel: string;
};

export function calculateTrailingMetrics(samples: TrailingSample[]): TrailingMetrics {
  const valid = samples.filter((s) => s.valid && Number.isFinite(s.gazeX) && Number.isFinite(s.targetX));
  if (valid.length < 8) {
    return {
      samplesCount: valid.length,
      accuracyPercent: 0,
      meanDeviation: 0,
      intrusiveSaccades: 0,
      status: "insufficient_data",
      statusLabel: "Data Okulomotor Tidak Cukup",
    };
  }

  let sumDev = 0;
  let onTrackCount = 0;
  let intrusiveSaccades = 0;

  for (let i = 0; i < valid.length; i++) {
    const s = valid[i];
    const dx = s.gazeX - s.targetX;
    const dy = (s.gazeY ?? 0.5) - (s.targetY ?? 0.5);
    const dev = Math.sqrt(dx * dx + dy * dy);
    sumDev += dev;

    if (dev <= 0.18) {
      onTrackCount++;
    }

    if (i > 0) {
      const prev = valid[i - 1];
      const deltaGaze = Math.sqrt((s.gazeX - prev.gazeX) ** 2 + ((s.gazeY ?? 0.5) - (prev.gazeY ?? 0.5)) ** 2);
      const deltaTarget = Math.sqrt((s.targetX - prev.targetX) ** 2 + ((s.targetY ?? 0.5) - (prev.targetY ?? 0.5)) ** 2);
      if (deltaGaze > 0.22 && deltaTarget < 0.10) {
        intrusiveSaccades++;
      }
    }
  }

  const meanDeviation = sumDev / valid.length;
  const accuracyPercent = Math.round((onTrackCount / valid.length) * 100);

  let status: TrailingMetrics["status"] = "optimal";
  let statusLabel = "Sinkronisasi Halus & Stabil";

  if (accuracyPercent < 60 || intrusiveSaccades >= 3) {
    status = "high_dispersion";
    statusLabel = "Defisit Penelusuran (Saccadic Intrusions Terdeteksi)";
  } else if (accuracyPercent < 78 || intrusiveSaccades >= 1) {
    status = "moderate_lag";
    statusLabel = "Keterlambatan Penelusuran Moderat (Lagging)";
  }

  return {
    samplesCount: valid.length,
    accuracyPercent,
    meanDeviation: Math.round(meanDeviation * 1000) / 1000,
    intrusiveSaccades,
    status,
    statusLabel,
  };
}

export function generateDemoTrailingSamples(profile: "stable" | "variable"): TrailingSample[] {
  const count = 100;
  const durationMs = 10_000;
  const samples: TrailingSample[] = [];

  for (let i = 0; i < count; i++) {
    const timeMs = (i / (count - 1)) * durationMs;
    // 5000ms per full 2D lemniscate loop (2 full loops in 10s)
    const t = (2 * Math.PI * timeMs) / 5000;
    const targetX = 0.5 + 0.32 * Math.sin(t);
    const targetY = 0.5 + 0.20 * Math.sin(2 * t);

    let gazeX = targetX;
    let gazeY = targetY;

    if (profile === "stable") {
      // Subtle smooth pursuit noise (< 0.04)
      const noiseX = Math.sin(i * 0.4) * 0.02 + (((i * 7) % 5) - 2) * 0.005;
      const noiseY = Math.cos(i * 0.4) * 0.02 + (((i * 11) % 5) - 2) * 0.005;
      gazeX = Math.max(0.05, Math.min(0.95, targetX + noiseX));
      gazeY = Math.max(0.08, Math.min(0.92, targetY + noiseY));
    } else {
      // Phase lag: eyes lag behind target by ~320ms
      const lagT = (2 * Math.PI * Math.max(0, timeMs - 320)) / 5000;
      let lagGazeX = 0.5 + 0.32 * Math.sin(lagT) + (((i * 11) % 7) - 3) * 0.025;
      let lagGazeY = 0.5 + 0.20 * Math.sin(2 * lagT) + (((i * 13) % 7) - 3) * 0.025;

      // 3 Intrusive saccades at specific intervals (glancing away abruptly)
      if ((i >= 24 && i <= 27) || (i >= 52 && i <= 55) || (i >= 78 && i <= 81)) {
        lagGazeX = (i >= 52 && i <= 55) ? 0.15 : 0.85;
        lagGazeY = (i >= 52 && i <= 55) ? 0.85 : 0.15;
      }

      gazeX = Math.max(0.05, Math.min(0.95, lagGazeX));
      gazeY = Math.max(0.08, Math.min(0.92, lagGazeY));
    }

    samples.push({
      timeMs: Math.round(timeMs),
      targetX: Math.round(targetX * 1000) / 1000,
      targetY: Math.round(targetY * 1000) / 1000,
      gazeX: Math.round(gazeX * 1000) / 1000,
      gazeY: Math.round(gazeY * 1000) / 1000,
      valid: true,
    });
  }

  return samples;
}
