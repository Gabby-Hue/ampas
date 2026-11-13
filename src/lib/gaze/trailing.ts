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
    const dev = Math.abs(s.gazeX - s.targetX);
    sumDev += dev;

    if (dev <= 0.16) {
      onTrackCount++;
    }

    if (i > 0) {
      const prev = valid[i - 1];
      const deltaGaze = Math.abs(s.gazeX - prev.gazeX);
      const deltaTarget = Math.abs(s.targetX - prev.targetX);
      if (deltaGaze > 0.20 && deltaTarget < 0.08) {
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
    // 4000ms per full pendulum cycle
    const phaseAngle = (2 * Math.PI * timeMs) / 4000;
    const targetX = 0.5 + 0.35 * Math.sin(phaseAngle);
    const targetY = 0.5;

    let gazeX = targetX;
    let gazeY = targetY;

    if (profile === "stable") {
      // Subtle smooth pursuit noise (< 0.04)
      const noise = Math.sin(i * 0.4) * 0.02 + ((i * 7) % 5 - 2) * 0.005;
      gazeX = Math.max(0.05, Math.min(0.95, targetX + noise));
      gazeY = Math.max(0.1, Math.min(0.9, targetY + noise * 0.5));
    } else {
      // Phase lag: eyes lag behind target by ~300ms
      const lagAngle = (2 * Math.PI * Math.max(0, timeMs - 300)) / 4000;
      let lagGazeX = 0.5 + 0.35 * Math.sin(lagAngle) + ((i * 11) % 7 - 3) * 0.02;

      // 3 Intrusive saccades at specific intervals (glancing away)
      if ((i >= 24 && i <= 27) || (i >= 52 && i <= 55) || (i >= 78 && i <= 81)) {
        lagGazeX = (i >= 52 && i <= 55) ? 0.15 : 0.85;
      }

      gazeX = Math.max(0.05, Math.min(0.95, lagGazeX));
      gazeY = 0.5 + Math.cos(i * 0.3) * 0.08;
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
