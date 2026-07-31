import { useRef, useState, useEffect, useCallback } from 'react';
import { useHandTracking }   from '../hooks/useHandTracking';
import { useGestureEngine }  from '../hooks/useGestureEngine';
import Toolbar               from './Toolbar';

export default function AirCanvas() {
  const overlayCanvasRef  = useRef(null);
  const drawingCanvasRef  = useRef(null);

  const [activeColor,   setActiveColor]   = useState('#ef4444');
  const [activeTool,    setActiveTool]    = useState('draw');
  const [toolbarButtons, setToolbarButtons] = useState([]);
  const [canvasSize,    setCanvasSize]    = useState({ w: 1280, h: 720 });

  // Hand tracking
  const { videoRef, landmarks, isReady, error } = useHandTracking();

  // Resize canvases to match video stream dimensions
  useEffect(() => {
    function resize() {
      const video = videoRef.current;
      if (!video) return;
      const w = video.videoWidth  || window.innerWidth;
      const h = video.videoHeight || window.innerHeight;
      setCanvasSize({ w, h });
    }
    const v = videoRef.current;
    v?.addEventListener('loadedmetadata', resize);
    window.addEventListener('resize', resize);
    resize();
    return () => { v?.removeEventListener('loadedmetadata', resize); window.removeEventListener('resize', resize); };
  }, [videoRef, isReady]);

  // Sync canvas element sizes
  useEffect(() => {
    [overlayCanvasRef, drawingCanvasRef].forEach(ref => {
      if (ref.current) {
        ref.current.width  = canvasSize.w;
        ref.current.height = canvasSize.h;
      }
    });
  }, [canvasSize]);

  // Clear drawing canvas
  const handleClear = useCallback(() => {
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
  }, []);

  // Download drawing as PNG
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.download = `air-canvas-${Date.now()}.png`;
    link.href = drawingCanvasRef.current?.toDataURL('image/png');
    link.click();
  }, []);

  // Handle tool changes from gesture or toolbar click
  const handleToolChange = useCallback((toolId) => {
    if (['draw', 'erase'].includes(toolId)) {
      setActiveTool(toolId);
    } else if (toolId === 'clear') {
      handleClear();
      setActiveTool('draw');
    } else if (toolId === 'download') {
      handleDownload();
    } else {
      // It's a color id — find the color value
      const COLORS = { red:'#ef4444', blue:'#3b82f6', green:'#22c55e', yellow:'#eab308', white:'#ffffff' };
      if (COLORS[toolId]) { setActiveColor(COLORS[toolId]); setActiveTool('draw'); }
    }
  }, [handleClear, handleDownload]);

  // Run gesture engine every frame
  useGestureEngine({
    landmarks,
    overlayCanvasRef,
    drawingCanvasRef,
    videoRef,
    activeColor,
    activeTool,
    onToolChange: handleToolChange,
    toolbarButtons,
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950 select-none">

      {/* ── Video feed (mirrored via CSS) ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        style={{ transform: 'scaleX(-1)' }}
        muted playsInline
      />

      {/* ── Drawing canvas (persistent artwork) ── */}
      <canvas
        ref={drawingCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── Overlay canvas (landmarks + cursor, ephemeral) ── */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ── Toolbar ── */}
      <Toolbar
        activeColor={activeColor}
        activeTool={activeTool}
        onColorChange={setActiveColor}
        onToolChange={handleToolChange}
        onClear={handleClear}
        onDownload={handleDownload}
        onButtonsReady={setToolbarButtons}
      />

      {/* ── Loading state ── */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gray-950/90">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-cyan-400 text-xl font-semibold tracking-wide">Initialising AI Hand Tracking…</p>
          <p className="text-gray-500 text-sm mt-2">Allow camera access when prompted</p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gray-950/95">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-red-400 text-xl font-semibold">Camera Error</p>
          <p className="text-gray-400 text-sm mt-2 max-w-sm text-center">{error}</p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* ── Gesture legend ── */}
      {isReady && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-4
                        bg-gray-900/70 backdrop-blur-sm border border-gray-700 rounded-xl px-5 py-2">
          {[
            ['☝️', 'Draw'],
            ['✌️', 'Hover'],
            ['🤏', 'Erase'],
          ].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-gray-300 text-sm">
              <span className="text-base">{icon}</span> {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
