import { useRef, useEffect } from 'react';

const COLORS = [
  { id: 'red',    label: '🔴', value: '#ef4444' },
  { id: 'blue',   label: '🔵', value: '#3b82f6' },
  { id: 'green',  label: '🟢', value: '#22c55e' },
  { id: 'yellow', label: '🟡', value: '#eab308' },
  { id: 'white',  label: '⚪', value: '#ffffff' },
];

const ACTIONS = [
  { id: 'erase',    label: '🧹', title: 'Eraser' },
  { id: 'clear',    label: '🗑️', title: 'Clear All' },
  { id: 'download', label: '💾', title: 'Save Image' },
];

/**
 * Floating toolbar at the top of the screen.
 * Exposes DOM rects for gesture hit-testing via onButtonsReady callback.
 */
export default function Toolbar({
  activeColor,
  activeTool,
  onColorChange,
  onToolChange,
  onClear,
  onDownload,
  onButtonsReady,
}) {
  const buttonRefs = useRef({});
  const lastSerializedRef = useRef('');

  // Report button bounding rects to parent so gesture engine can hit-test them
  useEffect(() => {
    const update = () => {
      const buttons = [];
      Object.entries(buttonRefs.current).forEach(([id, el]) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          buttons.push({
            id,
            rect: {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            },
          });
        }
      });
      const serialized = JSON.stringify(buttons);
      if (serialized !== lastSerializedRef.current) {
        lastSerializedRef.current = serialized;
        onButtonsReady?.(buttons);
      }
    };

    update();
    const id = window.setInterval(update, 200);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, [onButtonsReady]);

  function handleAction(id) {
    if (id === 'clear')    onClear();
    else if (id === 'download') onDownload();
    else onToolChange(id);
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                    bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl px-4 py-2 shadow-2xl">
      {/* Color swatches */}
      <div className="flex gap-2 pr-3 border-r border-gray-700">
        {COLORS.map(color => (
          <button
            key={color.id}
            type="button"
            ref={el => buttonRefs.current[color.id] = el}
            onClick={() => { onColorChange(color.value); onToolChange('draw'); }}
            title={color.id}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
              ${activeColor === color.value && activeTool === 'draw'
                ? 'border-white scale-110 ring-2 ring-white ring-offset-1 ring-offset-gray-900'
                : 'border-gray-600'}`}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pl-1">
        {ACTIONS.map(action => (
          <button
            key={action.id}
            type="button"
            ref={el => buttonRefs.current[action.id] = el}
            onClick={() => handleAction(action.id)}
            title={action.title}
            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
              hover:bg-gray-700 hover:scale-110
              ${activeTool === action.id
                ? 'bg-gray-600 ring-2 ring-white'
                : 'bg-gray-800'}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
