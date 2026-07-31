// Finger landmark indices (tip and PIP joint)
export const FINGER_TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
export const FINGER_PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

/**
 * Determine if a finger is extended upward.
 * A finger is "up" if its TIP y-coordinate is ABOVE (smaller) its PIP joint.
 * MediaPipe landmark y values increase downward, so tip.y < pip.y means extended.
 * @param {Array} landmarks - Array of 21 normalized {x, y, z} landmarks
 * @param {string} finger - One of 'index'|'middle'|'ring'|'pinky'
 */
export function isFingerUp(landmarks, finger) {
  const tip = landmarks[FINGER_TIPS[finger]];
  const pip = landmarks[FINGER_PIPS[finger]];
  return tip.y < pip.y;
}

/**
 * Check pinch gesture: thumb tip and index tip within a distance threshold.
 * Uses normalized coords (0–1 range), so ~0.05 is ~5% of frame width.
 */
export function isPinching(landmarks, threshold = 0.05) {
  const thumb = landmarks[FINGER_TIPS.thumb];
  const index = landmarks[FINGER_TIPS.index];
  const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  return dist < threshold;
}

/**
 * Classify current hand gesture into one of: 'draw' | 'hover' | 'erase' | 'none'
 *
 * DRAW  → index UP, middle DOWN (pointing gesture)
 * HOVER → index UP, middle UP (peace sign)
 * ERASE → thumb + index pinched
 * NONE  → fist or unrecognized
 */
export function classifyGesture(landmarks) {
  const indexUp  = isFingerUp(landmarks, 'index');
  const middleUp = isFingerUp(landmarks, 'middle');
  const ringUp   = isFingerUp(landmarks, 'ring');
  const pinkyUp  = isFingerUp(landmarks, 'pinky');
  const pinching = isPinching(landmarks);

  if (pinching)                          return 'erase';
  if (indexUp && middleUp && !ringUp && !pinkyUp) return 'hover';
  if (indexUp && !middleUp)             return 'draw';
  return 'none';
}

/**
 * Convert a normalized MediaPipe landmark to canvas pixel coords.
 * The video is mirrored (scaleX: -1), so we flip x: canvasX = (1 - norm.x) * width
 */
export function toCanvasCoords(landmark, canvasWidth, canvasHeight) {
  return {
    x: (1 - landmark.x) * canvasWidth,  // mirror flip
    y: landmark.y * canvasHeight,
  };
}
