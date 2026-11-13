"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { calculateGazeQuality, type GazeQuality, type GazeSample } from "./quality";
import { estimateRelativeIrisPosition } from "./estimate";

const MODEL_URL = "/mediapipe/face_landmarker.task";
const WASM_URL = "/mediapipe/wasm";

export function useGazeTracking(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [quality, setQuality] = useState<GazeQuality>({ status: "unavailable", reason: "no-samples", coverage: 0, relativeDispersion: 0, validSamples: 0 });
  const [trace, setTrace] = useState<GazeSample[]>([]);
  const [latestSample, setLatestSample] = useState<GazeSample | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "tracking" | "unavailable">("idle");
  const samplesRef = useRef<GazeSample[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let animationFrame = 0;
    let landmarker: { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks?: Array<Array<{ x: number; y: number }>> }; close?: () => void } | null = null;
    let lastSampleAt = 0;
    const track = async () => {
      setStatus("loading");
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = { runningMode: "VIDEO" as const, numFaces: 1, outputFaceBlendshapes: false };
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" } });
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" } });
        }
        if (cancelled) {
          landmarker.close?.();
          return;
        }
        setStatus("tracking");
        const tick = () => {
          const video = videoRef.current;
          if (!cancelled && video && video.readyState >= 2 && video.videoWidth > 0) {
            const timestamp = performance.now();
            if (timestamp - lastSampleAt < 100) {
              if (!cancelled) animationFrame = requestAnimationFrame(tick);
              return;
            }
            lastSampleAt = timestamp;
            try {
              const result = landmarker?.detectForVideo(video, timestamp);
              const landmarks = result?.faceLandmarks?.[0] ?? [];
              const s = estimateRelativeIrisPosition(landmarks);
              samplesRef.current.push(s);
              setLatestSample(s);
              if (samplesRef.current.length > 180) samplesRef.current.shift();
              setQuality(calculateGazeQuality(samplesRef.current));
              setTrace(samplesRef.current.slice(-48));
            } catch {
              const s = { x: 0, y: 0, valid: false };
              samplesRef.current.push(s);
              setLatestSample(s);
              if (samplesRef.current.length > 180) samplesRef.current.shift();
              setQuality(calculateGazeQuality(samplesRef.current));
              setTrace(samplesRef.current.slice(-48));
            }
          }
          if (!cancelled) animationFrame = requestAnimationFrame(tick);
        };
        animationFrame = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setQuality({ status: "unavailable", reason: "no-samples", coverage: 0, relativeDispersion: 0, validSamples: 0 });
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

  const reset = () => {
    samplesRef.current = [];
    setQuality({ status: "unavailable", reason: "no-samples", coverage: 0, relativeDispersion: 0, validSamples: 0 });
    setTrace([]);
    setLatestSample(null);
  };

  return { quality, status, trace, reset, latestSample };
}
