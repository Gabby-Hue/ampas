"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { calculateGazeQuality, calculateOutOfBoundsRate, type GazeQuality, type GazeSample } from "./quality";
import {
  applyGazeCalibration,
  estimateFaceDiagnostics,
  estimateRelativeIrisPosition,
  type FaceDiagnostics,
  type GazeCalibration,
} from "./estimate";

const MODEL_URL = "/mediapipe/face_landmarker.task";
const WASM_URL = "/mediapipe/wasm";

const INITIAL_QUALITY: GazeQuality = {
  status: "unavailable",
  reason: "no-samples",
  coverage: 0,
  relativeDispersion: 0,
  validSamples: 0,
};

const INITIAL_FACE: FaceDiagnostics = {
  faceDetected: false,
  faceCentered: false,
  distanceStatus: "unknown",
  interOcularSpan: 0,
  noseX: 0.5,
  noseY: 0.5,
};

export type EnvironmentDiagnostics = {
  brightness: number; // 0-100
  fps: number;
  face: FaceDiagnostics;
  stableFaceSeconds: number;
};

function isMediaPipeNoise(args: unknown[]): boolean {
  const msg = args.map((a) => String(a)).join(" ");
  return (
    msg.includes("Created TensorFlow Lite") ||
    msg.includes("face_landmarker_graph.cc") ||
    msg.includes("inference_feedback_manager.cc") ||
    msg.includes("gl_context.cc") ||
    msg.includes("FaceBlendshapesGraph") ||
    /^(INFO:|WARNING:|[IW]\d{4}\s)/.test(msg.trim())
  );
}

function runWithFilteredLogs<T>(fn: () => T): T {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (isMediaPipeNoise(args)) return;
    origError.apply(console, args);
  };
  try {
    return fn();
  } finally {
    console.error = origError;
  }
}

async function runAsyncWithFilteredLogs<T>(fn: () => Promise<T>): Promise<T> {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (isMediaPipeNoise(args)) return;
    origError.apply(console, args);
  };
  try {
    return await fn();
  } finally {
    console.error = origError;
  }
}

function measureFrameBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return Math.round((sum / (pixelCount * 255)) * 100);
}

export function useGazeTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  recordSamples = true
) {
  const [quality, setQuality] = useState<GazeQuality>(INITIAL_QUALITY);
  const [outOfBoundsRate, setOutOfBoundsRate] = useState(0);
  const [trace, setTrace] = useState<GazeSample[]>([]);
  const [latestSample, setLatestSample] = useState<GazeSample | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "tracking" | "unavailable">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<GazeCalibration | null>(null);
  const [env, setEnv] = useState<EnvironmentDiagnostics>({
    brightness: 0,
    fps: 0,
    face: INITIAL_FACE,
    stableFaceSeconds: 0,
  });

  const samplesRef = useRef<GazeSample[]>([]);
  const calibrationRef = useRef<GazeCalibration | null>(null);
  const recordSamplesRef = useRef(recordSamples);
  const latestRawSampleRef = useRef<GazeSample>({ x: 0.5, y: 0.5, valid: false });

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  useEffect(() => {
    recordSamplesRef.current = recordSamples;
  }, [recordSamples]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let landmarker: {
      detectForVideo: (
        video: HTMLVideoElement,
        timestamp: number
      ) => { faceLandmarks?: Array<Array<{ x: number; y: number }>> };
      close?: () => void;
    } | null = null;

    let lastSampleAt = 0;
    let lastDetectTs = 0;
    let lastVideoTime = -1;
    let lastBrightnessAt = 0;
    let latestBrightness = 0;
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();
    let currentFps = 0;
    let faceStableStart: number | null = null;

    const lumCanvas = document.createElement("canvas");
    lumCanvas.width = 64;
    lumCanvas.height = 48;

    const track = async () => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = {
          runningMode: "VIDEO" as const,
          numFaces: 1,
          outputFaceBlendshapes: false,
        };

        try {
          landmarker = await runAsyncWithFilteredLogs(() =>
            FaceLandmarker.createFromOptions(vision, {
              ...options,
              baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            })
          );
        } catch {
          landmarker = await runAsyncWithFilteredLogs(() =>
            FaceLandmarker.createFromOptions(vision, {
              ...options,
              baseOptions: { modelAssetPath: MODEL_URL },
            })
          );
        }

        if (cancelled) {
          landmarker.close?.();
          return;
        }
        setStatus("tracking");

        const tick = () => {
          const video = videoRef.current;
          if (!cancelled && video && video.readyState >= 2 && video.videoWidth > 0) {
            const now = performance.now();
            if (now - lastSampleAt < 50) {
              animationFrame = requestAnimationFrame(tick);
              return;
            }
            if (video.currentTime === lastVideoTime) {
              animationFrame = requestAnimationFrame(tick);
              return;
            }
            lastSampleAt = now;
            lastVideoTime = video.currentTime;

            fpsFrames += 1;
            const fpsElapsed = now - fpsWindowStart;
            if (fpsElapsed >= 1500) {
              currentFps = Math.round((fpsFrames * 1000) / fpsElapsed);
              fpsFrames = 0;
              fpsWindowStart = now;
            }

            if (now - lastBrightnessAt >= 400) {
              lastBrightnessAt = now;
              try {
                latestBrightness = measureFrameBrightness(video, lumCanvas);
              } catch {
                // ignore canvas read errors
              }
            }

            try {
              const ts = Math.max(lastDetectTs + 1, Math.round(now));
              lastDetectTs = ts;
              const result = runWithFilteredLogs(() => landmarker?.detectForVideo(video, ts));
              const landmarks = result?.faceLandmarks?.[0] ?? [];
              const faceDiag = estimateFaceDiagnostics(landmarks);

              if (faceDiag.faceDetected && faceDiag.faceCentered) {
                if (faceStableStart === null) faceStableStart = now;
              } else {
                faceStableStart = null;
              }
              const stableFaceSeconds =
                faceStableStart === null ? 0 : Math.round(((now - faceStableStart) / 1000) * 10) / 10;

              setEnv({
                brightness: latestBrightness,
                fps: currentFps || 20,
                face: faceDiag,
                stableFaceSeconds,
              });

              const rawSample = estimateRelativeIrisPosition(landmarks);
              latestRawSampleRef.current = rawSample;
              setLatestSample(rawSample);

              if (recordSamplesRef.current) {
                const calibrated = applyGazeCalibration(rawSample, calibrationRef.current);
                const withTimestamp = { ...calibrated, recordedAt: now };
                samplesRef.current.push(withTimestamp);
                if (samplesRef.current.length > 360) samplesRef.current.shift();
                setQuality(calculateGazeQuality(samplesRef.current));
                setOutOfBoundsRate(calculateOutOfBoundsRate(samplesRef.current));
                setTrace(samplesRef.current.slice(-72));
              }
            } catch {
              setLatestSample({ x: 0, y: 0, valid: false });
              if (recordSamplesRef.current) {
                samplesRef.current.push({ x: 0, y: 0, valid: false });
                setQuality(calculateGazeQuality(samplesRef.current));
                setOutOfBoundsRate(calculateOutOfBoundsRate(samplesRef.current));
                setTrace(samplesRef.current.slice(-72));
              }
            }
          }
          if (!cancelled) animationFrame = requestAnimationFrame(tick);
        };
        animationFrame = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) {
          setStatus("unavailable");
          setErrorMessage(err instanceof Error ? err.message : "Gagal memuat model pelacakan wajah WASM.");
          setQuality(INITIAL_QUALITY);
        }
      }
    };

    void track();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close?.();
    };
  }, [enabled, videoRef]);

  const reset = useCallback(() => {
    samplesRef.current = [];
    setQuality(INITIAL_QUALITY);
    setOutOfBoundsRate(0);
    setTrace([]);
    setLatestSample(null);
  }, []);

  const getLatestRawSample = useCallback(() => latestRawSampleRef.current, []);

  return {
    quality,
    outOfBoundsRate,
    status: enabled ? status : "idle",
    errorMessage,
    trace,
    env,
    calibration,
    setCalibration,
    getLatestRawSample,
    latestSample,
    reset,
  };
}
