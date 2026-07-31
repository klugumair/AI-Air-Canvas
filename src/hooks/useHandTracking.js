import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Custom hook that initialises MediaPipe HandLandmarker and
 * runs real-time detection on each animation frame.
 *
 * Returns: { videoRef, landmarks, isReady, error }
 *   - videoRef: attach to the <video> element
 *   - landmarks: the latest array of 21 hand landmarks (or null)
 *   - isReady: boolean — model loaded and camera streaming
 *   - error: string | null
 */
export function useHandTracking() {
  const videoRef      = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef        = useRef(null);
  const lastTimeRef   = useRef(-1);

  const [landmarks, setLandmarks] = useState(null);
  const [isReady,   setIsReady]   = useState(false);
  const [error,     setError]     = useState(null);

  // --- Per-frame detection loop ---
  const startDetectionLoop = useCallback(() => {
    function detect() {
      const video     = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      // Skip duplicate frames (browser may call rAF before new video frame)
      if (now !== lastTimeRef.current) {
        lastTimeRef.current = now;
        const results = landmarker.detectForVideo(video, now);
        // Use first detected hand's landmarks (index 0)
        setLandmarks(results.landmarks?.[0] ?? null);
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  // --- Initialise MediaPipe HandLandmarker ---
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Load the WASM/model bundle from the jsDelivr CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU', // falls back to CPU automatically
          },
          runningMode: 'VIDEO',
          numHands: 1,          // single hand for performance
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence:     0.5,
        });

        if (cancelled) return;
        landmarkerRef.current = handLandmarker;

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach(t => t.stop());
          throw new Error('Video element not available.');
        }

        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          setIsReady(true);
          startDetectionLoop();
        };
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to initialise camera/model.');
      }
    }

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      landmarkerRef.current?.close();
    };
  }, [startDetectionLoop]);

  return { videoRef, landmarks, isReady, error };
}
