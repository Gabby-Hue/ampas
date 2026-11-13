"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  samples: Array<{ x: number; y: number; valid: boolean }>;
  gdiScore?: number;
  isDemo?: boolean;
};

// Generate 256-color clinical thermal palette (Navy -> Cyan -> Green -> Yellow -> Orange -> Crimson -> White)
function createThermalPalette(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8ClampedArray(256 * 4);

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, "rgba(11, 122, 83, 0)");
  grad.addColorStop(0.15, "rgba(111, 211, 165, 0.35)");
  grad.addColorStop(0.35, "rgba(11, 122, 83, 0.55)");
  grad.addColorStop(0.55, "rgba(7, 94, 64, 0.75)");
  grad.addColorStop(0.72, "rgba(154, 103, 0, 0.85)");
  grad.addColorStop(0.88, "rgba(180, 35, 24, 0.95)");
  grad.addColorStop(1.0, "rgba(117, 20, 12, 1.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export function RadarGazeHeatmap({ samples, gdiScore, isDemo = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewType, setViewType] = useState<"thermal" | "scatter">("thermal");

  // Calculate zone distributions
  const valid = samples.filter((s) => s.valid && Number.isFinite(s.x) && Number.isFinite(s.y));
  let inFovealCount = 0;
  let inParafovealCount = 0;
  let inOuterCount = 0;

  valid.forEach((s) => {
    const dx = s.x - 0.5;
    const dy = s.y - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0.08) inFovealCount++;
    else if (dist <= 0.18) inParafovealCount++;
    else inOuterCount++;
  });

  const fovealPercent = valid.length ? Math.round((inFovealCount / valid.length) * 100) : 0;
  const parafovealPercent = valid.length ? Math.round((inParafovealCount / valid.length) * 100) : 0;
  const outerPercent = valid.length ? Math.round((inOuterCount / valid.length) * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clinical light radar background
    ctx.fillStyle = "#10241c";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.44;

    // 1. Draw Radar Grid
    // Concentric rings
    const rings = [
      { r: maxRadius * 0.25, label: "25% (Foveal Focus)", color: "rgba(11, 122, 83, 0.30)", dash: [2, 3] },
      { r: maxRadius * 0.50, label: "50% (Parafoveal)", color: "rgba(11, 122, 83, 0.16)", dash: [4, 4] },
      { r: maxRadius * 0.75, label: "75% (Perifoveal)", color: "rgba(11, 122, 83, 0.12)", dash: [4, 4] },
      { r: maxRadius * 1.00, label: "100% (Outer Boundary)", color: "rgba(11, 122, 83, 0.22)", dash: [] },
    ];

    rings.forEach((ring) => {
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 1;
      ctx.setLineDash(ring.dash);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Radial spokes (Crosshair & 45 degree diagonals)
    ctx.strokeStyle = "rgba(11, 122, 83, 0.10)";
    ctx.lineWidth = 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
      ctx.stroke();
    }

    // Distance ring labels
    ctx.fillStyle = "#5f756b";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("±0.05", centerX + 4, centerY - maxRadius * 0.25 - 2);
    ctx.fillText("±0.10", centerX + 4, centerY - maxRadius * 0.50 - 2);
    ctx.fillText("±0.15", centerX + 4, centerY - maxRadius * 0.75 - 2);

    if (valid.length === 0) {
      ctx.fillStyle = "#5f756b";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Data fiksasi gaze tidak cukup", centerX, centerY);
      return;
    }

    if (viewType === "thermal") {
      // 2. Offscreen True Heatmap Accumulation
      const offCanvas = document.createElement("canvas");
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      // Blur size & intensity
      const spotRadius = Math.max(16, maxRadius * 0.18);
      valid.forEach((s) => {
        // Map normalized relative coordinates (0..1) to radar circle bounds
        const mappedX = centerX + (s.x - 0.5) * (maxRadius * 2.8);
        const mappedY = centerY + (s.y - 0.5) * (maxRadius * 2.8);

        const radial = offCtx.createRadialGradient(mappedX, mappedY, 0, mappedX, mappedY, spotRadius);
        radial.addColorStop(0, "rgba(0, 0, 0, 0.24)");
        radial.addColorStop(1, "rgba(0, 0, 0, 0)");

        offCtx.fillStyle = radial;
        offCtx.beginPath();
        offCtx.arc(mappedX, mappedY, spotRadius, 0, Math.PI * 2);
        offCtx.fill();
      });

      // Colorize using thermal palette
      const imgData = offCtx.getImageData(0, 0, width, height);
      const pixels = imgData.data;
      const palette = createThermalPalette();

      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3];
        if (alpha > 0) {
          const palIdx = alpha * 4;
          pixels[i] = palette[palIdx];
          pixels[i + 1] = palette[palIdx + 1];
          pixels[i + 2] = palette[palIdx + 2];
          pixels[i + 3] = Math.min(240, palette[palIdx + 3] * 1.8);
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Clip to radar bounds for clinical clean look
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(offCanvas, 0, 0);
      ctx.restore();
    } else {
      // Scatter Gaze Points view with connected micro-vectors
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(11, 122, 83, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      valid.forEach((s, idx) => {
        const x = centerX + (s.x - 0.5) * (maxRadius * 2.8);
        const y = centerY + (s.y - 0.5) * (maxRadius * 2.8);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      valid.forEach((s) => {
        const x = centerX + (s.x - 0.5) * (maxRadius * 2.8);
        const y = centerY + (s.y - 0.5) * (maxRadius * 2.8);
        const dx = s.x - 0.5;
        const dy = s.y - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ctx.fillStyle = dist <= 0.08 ? "#0b7a53" : dist <= 0.18 ? "#9a6700" : "#b42318";
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Central Bullseye cross marker
    ctx.strokeStyle = "#10241c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    // Central core dot
    ctx.fillStyle = "#0b7a53";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [samples, viewType, valid]);

  const stabilityBadge =
    fovealPercent >= 65
      ? { label: "Fiksasi Sangat Tenang (Foveal Lock)", color: "var(--accent)" }
      : fovealPercent >= 45
      ? { label: "Dispersi Moderat (Parafoveal Drift)", color: "var(--warning)" }
      : { label: "Dispersi Tinggi (Inattentive Gaze)", color: "var(--danger)" };

  return (
    <div className="gaze-panel" style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Radar Kestabilan Fiksasi Tatapan Mata {isDemo ? "(Simulasi)" : ""}
            </strong>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                color: stabilityBadge.color,
                border: `1px solid ${stabilityBadge.color}`,
              }}
            >
              {stabilityBadge.label}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Peta kepadatan termal fiksasi mata terhadap titik pusat stimulus selama uji CPT berlangsung.
          </p>
        </div>

        {/* Toggle View */}
        <div style={{ display: "flex", gap: "6px" }} className="btn-no-print">
          <button
            type="button"
            className={viewType === "thermal" ? "primary-button" : "secondary-button"}
            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
            onClick={() => setViewType("thermal")}
          >
            Peta Termal Panas
          </button>
          <button
            type="button"
            className={viewType === "scatter" ? "primary-button" : "secondary-button"}
            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
            onClick={() => setViewType("scatter")}
          >
            Titik Vektor Sampel
          </button>
        </div>
      </div>

      {/* Metrics Row: Zone Concentration */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "14px" }}>
        <div style={{ background: "var(--surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Foveal Core (0-25%)</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)", margin: "2px 0" }}>
            {fovealPercent}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Fokus tepat di target</div>
        </div>

        <div style={{ background: "var(--surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Parafoveal (25-50%)</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--warning)", margin: "2px 0" }}>
            {parafovealPercent}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pergeseran wajar</div>
        </div>

        <div style={{ background: "var(--surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Outer Drift (&gt;50%)</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: outerPercent > 20 ? "var(--danger)" : "var(--text-muted)", margin: "2px 0" }}>
            {outerPercent}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tatapan melayang</div>
        </div>

        {gdiScore !== undefined && (
          <div style={{ background: "var(--surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--surface-border-subtle)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>GDI Index</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: "2px 0" }}>
              {gdiScore.toFixed(3)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Dispersi kuadratik</div>
          </div>
        )}
      </div>

      {/* Radar Canvas */}
      <div style={{ width: "100%", height: "240px", position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--surface-border)" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {/* Thermal Color Scale Bar & Explanation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Kepadatan Tatapan:</span>
          <div
            style={{
              width: "120px",
              height: "8px",
              borderRadius: "4px",
              background: "linear-gradient(to right, #e4f4ec, #6fd3a5, #0b7a53, #075e40, #9a6700, #b42318, #75140c)",
            }}
          />
          <span style={{ fontSize: "0.70rem", color: "var(--text-muted)" }}>Dingin → Hotspot</span>
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Makin pekat warna merah/putih di pusat lingkaran (+), makin konsisten atensi foveal subjek.
        </div>
      </div>
    </div>
  );
}
