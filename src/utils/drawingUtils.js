/**
 * Draw a smooth quadratic bezier curve segment between a series of points.
 * Instead of lineTo(x, y) which causes jagged lines, we use the midpoint
 * between consecutive points as the control point for quadraticCurveTo.
 * This produces naturally smooth, continuous brushstrokes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x,y}>} points - Buffer of recent pointer positions
 * @param {string} color - CSS color string
 * @param {number} lineWidth
 */
export function drawSmoothLine(ctx, points, color, lineWidth = 4) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    // Midpoint between current and next point acts as the end point,
    // making curves flow naturally into each other
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

/**
 * Erase a circular area on the canvas around a given point.
 * Uses 'destination-out' composite operation to punch a hole in the drawing.
 */
export function eraseAtPoint(ctx, x, y, radius = 30) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a cursor indicator ring at the pointer position.
 * Used in 'hover' and 'erase' modes to give visual feedback.
 */
export function drawCursor(ctx, x, y, mode, color = '#ffffff') {
  ctx.beginPath();
  ctx.arc(x, y, mode === 'erase' ? 30 : 10, 0, Math.PI * 2);
  ctx.strokeStyle = mode === 'erase' ? 'rgba(255,100,100,0.8)' : color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}
