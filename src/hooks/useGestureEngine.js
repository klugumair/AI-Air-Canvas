import { useEffect, useRef } from 'react';
import { classifyGesture, toCanvasCoords } from '../utils/gestureUtils';
import { drawSmoothLine, eraseAtPoint, drawCursor } from '../utils/drawingUtils';

const POINT_BUFFER_SIZE = 6; // how many points to smooth over
const HOVER_DWELL_MS    = 500; // ms finger must hover a button to activate it

/**
 * Gesture engine hook.
 * Reads landmarks each frame, classifies the gesture, and:
 *   - Draws/erases on the drawing canvas
 *   - Renders the overlay (landmarks + cursor)
 *   - Detects hover over toolbar buttons
 *
 * @param {Object} params
 * @param {Array|null} params.landmarks  - From useHandTracking
 * @param {React.RefObject} params.overlayCanvasRef
 * @param {React.RefObject} params.drawingCanvasRef
 * @param {React.RefObject} params.videoRef
 * @param {string} params.activeColor
 * @param {string} params.activeTool   - 'draw'|'erase'|'clear'
 * @param {Function} params.onToolChange
 * @param {Array} params.toolbarButtons - [{id, label, rect}] bounding rects
 */
export function useGestureEngine({
  landmarks,
  overlayCanvasRef,
  drawingCanvasRef,
  videoRef,
  activeColor,
  activeTool,
  onToolChange,
  toolbarButtons = [],
}) {
  const pointBufferRef  = useRef([]);   // smoothing buffer
  const hoverTimerRef   = useRef(null); // dwell timer reference
  const hoverTargetRef  = useRef(null); // which button is being hovered

  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const overlayCtx  = overlayCanvas?.getContext('2d');
    const drawingCtx  = drawingCanvas?.getContext('2d');
    const video       = videoRef.current;

    if (!overlayCtx || !drawingCtx || !video || !overlayCanvas) return;

    const W = overlayCanvas.width;
    const H = overlayCanvas.height;

    // Clear the overlay every frame (it's ephemeral feedback only)
    overlayCtx.clearRect(0, 0, W, H);

    if (!landmarks) {
      // No hand detected — clear point buffer so lines don't jump on re-entry
      pointBufferRef.current = [];
      return;
    }

    // --- 1. Classify gesture ---
    const gesture = activeTool === 'erase' ? 'erase' : classifyGesture(landmarks);

    // --- 2. Get index finger tip in canvas space (Landmark #8) ---
    const tip = toCanvasCoords(landmarks[8], W, H);

    // Map canvas tip → viewport for hit-testing against getBoundingClientRect()
    const canvasRect = overlayCanvas.getBoundingClientRect();
    const tipClientX = canvasRect.left + (tip.x / W) * canvasRect.width;
    const tipClientY = canvasRect.top + (tip.y / H) * canvasRect.height;

    // --- 3. Toolbar hover detection ---
    const hoveredButton = toolbarButtons.find(btn => {
      return (
        tipClientX >= btn.rect.left &&
        tipClientX <= btn.rect.right &&
        tipClientY >= btn.rect.top &&
        tipClientY <= btn.rect.bottom
      );
    });

    if (hoveredButton) {
      if (hoverTargetRef.current !== hoveredButton.id) {
        // New button — reset dwell timer
        clearTimeout(hoverTimerRef.current);
        hoverTargetRef.current = hoveredButton.id;
        hoverTimerRef.current  = setTimeout(() => {
          onToolChange(hoveredButton.id); // trigger after 500ms dwell
        }, HOVER_DWELL_MS);
      }
      // Draw a fill ring on the button as progress feedback (canvas space)
      const btn = hoveredButton;
      const cx =
        ((btn.rect.left + btn.rect.right) / 2 - canvasRect.left) / canvasRect.width * W;
      const cy =
        ((btn.rect.top + btn.rect.bottom) / 2 - canvasRect.top) / canvasRect.height * H;
      overlayCtx.beginPath();
      overlayCtx.arc(cx, cy, 20, 0, Math.PI * 2);
      overlayCtx.strokeStyle = 'rgba(255,255,255,0.8)';
      overlayCtx.lineWidth = 3;
      overlayCtx.stroke();
    } else {
      // Finger left button zone — reset
      if (hoverTargetRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTargetRef.current = null;
      }
    }

    // --- 4. Draw landmark skeleton on overlay ---
    drawLandmarkOverlay(overlayCtx, landmarks, W, H);

    // --- 5. Act on gesture ---
    if (gesture === 'draw') {
      // Accumulate points in buffer for quadratic smoothing
      pointBufferRef.current.push(tip);
      if (pointBufferRef.current.length > POINT_BUFFER_SIZE) {
        pointBufferRef.current.shift();
      }
      drawSmoothLine(drawingCtx, pointBufferRef.current, activeColor, 4);
      drawCursor(overlayCtx, tip.x, tip.y, 'draw', activeColor);
    } else if (gesture === 'erase') {
      pointBufferRef.current = []; // reset draw buffer
      eraseAtPoint(drawingCtx, tip.x, tip.y, 30);
      drawCursor(overlayCtx, tip.x, tip.y, 'erase');
    } else {
      // hover or none — clear buffer so next draw stroke starts fresh
      pointBufferRef.current = [];
      if (gesture === 'hover') {
        drawCursor(overlayCtx, tip.x, tip.y, 'hover', '#ffffff');
      }
    }
  }, [landmarks, activeTool, activeColor, toolbarButtons, onToolChange, overlayCanvasRef, drawingCanvasRef, videoRef]);
}

// --- Landmark skeleton renderer ---
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],         // thumb
  [0,5],[5,6],[6,7],[7,8],         // index
  [0,9],[9,10],[10,11],[11,12],    // middle
  [0,13],[13,14],[14,15],[15,16],  // ring
  [0,17],[17,18],[18,19],[19,20],  // pinky
  [5,9],[9,13],[13,17],            // palm
];

function drawLandmarkOverlay(ctx, landmarks, W, H) {
  // Draw connections
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
  ctx.lineWidth = 1.5;
  CONNECTIONS.forEach(([a, b]) => {
    const pA = toCanvasCoords(landmarks[a], W, H);
    const pB = toCanvasCoords(landmarks[b], W, H);
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
  });

  // Draw landmark dots
  landmarks.forEach((lm, i) => {
    const p = toCanvasCoords(lm, W, H);
    ctx.beginPath();
    ctx.arc(p.x, p.y, i === 8 ? 6 : 3, 0, Math.PI * 2); // highlight index tip
    ctx.fillStyle = i === 8 ? '#00ffcc' : 'rgba(255,255,255,0.7)';
    ctx.fill();
  });
}
