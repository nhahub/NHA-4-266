import { useRef, useState, useCallback, useEffect } from 'react';
import { detectObjects } from '../services/apiService';

const TARGET_FPS = 15;
const TICK_INTERVAL_MS = Math.round(1000 / TARGET_FPS); // ~67ms
const JPEG_QUALITY = 0.8;

/**
 * useInferencePipeline
 * ---------------------------------------------------------------------------
 * The processing loop. On an interval (~15fps), grabs the current frame from
 * the active <video> element via an off-screen <canvas>, encodes it as a
 * JPEG Blob, and hands it to apiService.detectObjects(). Results (annotated
 * frame + detections) are exposed as state for the UI to render.
 *
 * Frames are dropped (not queued) if a previous request is still in flight,
 * so a slow backend degrades gracefully instead of building up a backlog.
 *
 * @param {Object} params
 * @param {React.RefObject<HTMLVideoElement>} params.videoRef
 * @param {boolean} params.isActive - whether a source (webcam/file) is live
 * @param {number} params.confidenceThreshold - 0.1 - 1.0
 */
export function useInferencePipeline({ videoRef, isActive, confidenceThreshold }) {
  // Off-screen canvas reused across ticks - never attached to the DOM
  const canvasRef = useRef(null);
  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas');
  }

  const intervalRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastTickAtRef = useRef(performance.now());
  const currentFrameUrlRef = useRef(null);

  const [processedFrameUrl, setProcessedFrameUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [isMocked, setIsMocked] = useState(false);
  const [lastInferenceMs, setLastInferenceMs] = useState(0);

  const captureFrameAsBlob = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 /* HAVE_CURRENT_DATA */) {
      return Promise.resolve(null);
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return Promise.resolve(null);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
    });
  }, [videoRef]);

  const runTick = useCallback(async () => {
    if (inFlightRef.current) return; // previous request still in flight - drop this tick

    const blob = await captureFrameAsBlob();
    if (!blob) return;

    inFlightRef.current = true;
    try {
      const result = await detectObjects(blob, confidenceThreshold);

      setDetections(result.detections || []);
      setIsMocked(Boolean(result.mocked));
      setLastInferenceMs(result.inferenceTimeMs || 0);

      // Swap in the new frame and release the previous object URL
      const nextUrl = URL.createObjectURL(result.image);
      if (currentFrameUrlRef.current) {
        URL.revokeObjectURL(currentFrameUrlRef.current);
      }
      currentFrameUrlRef.current = nextUrl;
      setProcessedFrameUrl(nextUrl);

      const now = performance.now();
      const delta = now - lastTickAtRef.current;
      lastTickAtRef.current = now;
      setFps(delta > 0 ? Math.min(TARGET_FPS, Math.round(1000 / delta)) : 0);
    } catch (err) {
      // detectObjects is designed not to throw, but guard anyway so the
      // interval loop never dies silently.
      console.error('[useInferencePipeline] Unexpected tick error:', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [captureFrameAsBlob, confidenceThreshold]);

  // Start/stop the interval loop as the source becomes active/inactive
  useEffect(() => {
    if (isActive) {
      lastTickAtRef.current = performance.now();
      intervalRef.current = setInterval(runTick, TICK_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, runTick]);

  // Reset visible state when the source is stopped
  useEffect(() => {
    if (!isActive) {
      if (currentFrameUrlRef.current) {
        URL.revokeObjectURL(currentFrameUrlRef.current);
        currentFrameUrlRef.current = null;
      }
      setProcessedFrameUrl(null);
      setDetections([]);
      setFps(0);
      setLastInferenceMs(0);
    }
  }, [isActive]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentFrameUrlRef.current) {
        URL.revokeObjectURL(currentFrameUrlRef.current);
      }
    };
  }, []);

  return { processedFrameUrl, detections, fps, isMocked, lastInferenceMs };
}
