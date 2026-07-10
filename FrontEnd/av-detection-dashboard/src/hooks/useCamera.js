import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useCamera
 * ---------------------------------------------------------------------------
 * Owns the single <video> element that acts as the raw input source for the
 * inference pipeline. Supports two sources:
 *   - the device webcam (getUserMedia)
 *   - an uploaded local video file (dashcam footage)
 *
 * Exposes a `videoRef` that must be attached to a <video> element in the UI.
 * The video is intentionally kept in the DOM (see VideoPlayer.jsx) so the
 * pipeline can read frames from it via a canvas.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [sourceType, setSourceType] = useState('none'); // 'none' | 'webcam' | 'file'
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support webcam access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        clearObjectUrl();
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setSourceType('webcam');
      setIsActive(true);
    } catch (err) {
      setError(err.message || 'Unable to access the webcam. Check browser permissions.');
      setIsActive(false);
      setSourceType('none');
    }
  }, [clearObjectUrl]);

  const loadVideoFile = useCallback(
    (file) => {
      setError(null);
      if (!file) return;

      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file (.mp4).');
        return;
      }

      // Stop any existing webcam stream before switching sources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      clearObjectUrl();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current
          .play()
          .catch((err) => setError(err.message || 'Unable to play the uploaded video.'));
      }

      setSourceType('file');
      setIsActive(true);
    },
    [clearObjectUrl]
  );

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    clearObjectUrl();

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    setSourceType('none');
    setIsActive(false);
    setError(null);
  }, [clearObjectUrl]);

  // Ensure camera/streams are released if the component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      clearObjectUrl();
    };
  }, [clearObjectUrl]);

  return {
    videoRef,
    sourceType,
    isActive,
    error,
    startWebcam,
    loadVideoFile,
    stop,
  };
}
