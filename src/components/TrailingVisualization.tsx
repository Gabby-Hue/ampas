"use client";

import { useEffect, useRef, useState } from "react";
import type { TrailingSample, TrailingMetrics } from "@/lib/gaze/trailing";

type Props = {
  samples: TrailingSample[];
  metrics: TrailingMetrics;
  isDemo?: boolean;
};

function createThermalPalette(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8ClampedArray(256 * 4);

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, "rgba(10, 20, 50, 0)");
  grad.addColorStop(0.15, "rgba(20, 90, 220, 0.4)");
  grad.addColorStop(0.35, "rgba(0, 210, 180, 0.7)");
  grad.addColorStop(0.55, "rgba(74, 222, 128, 0.85)");
  grad.addColorStop(0.72, "rgba(250, 204, 21, 0.95)");
  grad.addColorStop(0.88, "rgba(249, 115, 22, 1.0)");
  grad.addColorStop(0.96, "rgba(239, 68, 68, 1.0)");
  grad.addColorStop(1.0, "rgba(255, 255, 255, 1.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export function TrailingVisualization({ samples, metrics, isDemo = false }: Props) {
  const [viewMode, setViewMode] = useState<"waveform" | "spatial">("waveform");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Dark background matching surface-alt
    ctx.fillStyle = "#090d12";
    ctx.fillRect(0, 0, width, height);

    if (samples.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Data penelusuran mata tidak tersedia", width / 2, height / 2);
      return;
    }

    if (viewMode === "waveform") {
      // 1. Grid lines
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;

      // Horizontal reference lines (Center 0.5, Top 0.15, Bottom 0.85)
      const centerY = height * 0.5;
      const topY = height * 0.15;
      const bottomY = height * 0.85;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, topY);
      ctx.lineTo(width, topY);
      ctx.moveTo(0, bottomY);
      ctx.lineTo(width, bottomY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertical time grid (every 2 seconds)
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.font = "10px monospace";
      for (let sec = 0; sec <= 10; sec += 2) {
        const x = (sec / 10) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText(`${sec}s`, x + 4, height - 6);
      }

      // 2. Draw Target Path (Cyan/Teal)
      ctx.strokeStyle = "#00d2b4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      samples.forEach((s, i) => {
        const x = (s.timeMs / 10000) * width;
        const y = s.targetX * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 3. Draw Eye Gaze Path (Amber/Orange)
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      samples.forEach((s) => {
        if (!s.valid) return;
        const x = (s.timeMs / 10000) * width;
        const y = s.gazeX * height;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw highlighted discrepancy points
      samples.forEach((s) => {
        if (!s.valid) return;
        const diff = Math.abs(s.gazeX - s.targetX);
        if (diff > 0.18) {
          const x = (s.timeMs / 10000) * width;
          const y = s.gazeX * height;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else {
      // SPATIAL TRACK & HEATMAP VIEW
      // Draw horizontal target rail in center
      const railY = height * 0.5;
      ctx.strokeStyle = "rgba(0, 210, 180, 0.25)";
      ctx.lineWidth = 24;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(width * 0.15, railY);
      ctx.lineTo(width * 0.85, railY);
      ctx.stroke();

      // Centerline
      ctx.strokeStyle = "#00d2b4";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(width * 0.15, railY);
      ctx.lineTo(width * 0.85, railY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw True Thermal Heatmap along track using offscreen accumulation
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d");

      if (offCtx) {
        const radius = Math.max(16, height * 0.22);
        samples.forEach((s) => {
          if (!s.valid) return;
          const x = s.gazeX * width;
          const y = s.gazeY * height;

          const grad = offCtx.createRadialGradient(x, y, 0, x, y, radius);
          grad.addColorStop(0, "rgba(0, 0, 0, 0.22)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");

          offCtx.fillStyle = grad;
          offCtx.beginPath();
          offCtx.arc(x, y, radius, 0, Math.PI * 2);
          offCtx.fill();
        });

        const imgData = offCtx.getImageData(0, 0, width, height);
        const px = imgData.data;
        const pal = createThermalPalette();

        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3];
          if (a > 0) {
            const idx = a * 4;
            px[i] = pal[idx];
            px[i + 1] = pal[idx + 1];
            px[i + 2] = pal[idx + 2];
            px[i + 3] = Math.min(235, pal[idx + 3] * 1.8);
          }
        }

        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(off, 0, 0);
      }

      // Overlay target extremes
      ctx.fillStyle = "rgba(0, 210, 180, 0.85)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Batas Kiri (15%)", width * 0.15, railY + 28);
      ctx.fillText("Batas Kanan (85%)", width * 0.85, railY + 28);
      ctx.fillText("Pusat Lintasan", width * 0.5, railY - 18);
    }
  }, [samples, viewMode]);

  const badgeColor =
    metrics.accuracyPercent >= 75
      ? "var(--accent-teal)"
      : metrics.accuracyPercent >= 55
      ? "var(--accent-amber, #f59e0b)"
      : "var(--coral-danger)";

  return (
    <div className="gaze-panel" style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Tahap 3: Sinkronisasi Trailing Eyes (Smooth Pursuit) {isDemo ? "(Simulasi)" : ""}
            </strong>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                color: badgeColor,
                border: `1px solid ${badgeColor}`,
              }}
            >
              {metrics.statusLabel}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Mengukur kelancaran okulomotor saat mata menelusuri target sinusoidal horizontal 10 detik.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", gap: "6px" }} className="btn-no-print">
          <button
            type="button"
            className={viewMode === "waveform" ? "primary-button" : "secondary-button"}
            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
            onClick={() => setViewMode("waveform")}
          >
            Gelombang Waktu
          </button>
          <button
            type="button"
            className={viewMode === "spatial" ? "primary-button" : "secondary-button"}
            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
            onClick={() => setViewMode("spatial")}
          >
            Peta Heatmap 2D
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "14px" }}>
        <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Akurasi Penelusuran</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: badgeColor, margin: "2px 0" }}>
            {metrics.accuracyPercent}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Target on-track window</div>
        </div>

        <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Rata-rata Deviasi (Lag)</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: "2px 0" }}>
            {metrics.meanDeviation}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>RMS jarak lintasan</div>
        </div>

        <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Saccadic Intrusions</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: metrics.intrusiveSaccades > 1 ? "var(--coral-danger)" : "var(--accent-teal)", margin: "2px 0" }}>
            {metrics.intrusiveSaccades} Kali
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Lompatan tatapan mendadak</div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ width: "100%", height: "160px", position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--surface-border)" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#00d2b4", display: "inline-block" }} />
            Jalur Bola Target
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#f59e0b", display: "inline-block" }} />
            Jejak Tatapan Iris Mata
          </span>
          {viewMode === "waveform" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              Deviasi Ekstrem
            </span>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
          {samples.length} frame dianalisis
        </span>
      </div>
    </div>
  );
}
