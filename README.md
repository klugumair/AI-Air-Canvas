Draw in the air with your hand. No stylus, no touchscreen — just your webcam and your index finger.

Live demo → ai-canvaslive.netlify.app

What it does

Your webcam watches your hand in real time. MediaPipe detects 21 landmarks on your hand every frame, and this app turns those coordinates into brushstrokes on a canvas. Point your index finger to draw, flash a peace sign to hover, pinch to erase. The whole thing runs locally in your browser — nothing is sent to a server.

Gestures
Gesture	What happens
☝️ Index finger up	Draw — holds a line as you move
✌️ Index + middle up	Hover — navigate without drawing
🤏 Thumb + index pinch	Erase around the cursor
Hover over toolbar button for 0.5s	Selects that tool hands-free
Tech stack
React + Vite — project scaffold
MediaPipe Tasks Vision — hand landmark detection (runs on GPU via WebAssembly)
HTML5 Canvas API — dual canvas system: one for artwork, one for the live landmark overlay
Tailwind CSS — UI styling

No backend. No database. Entirely client-side.

How the drawing works

Raw landmark coordinates jump slightly frame to frame. Drawing a straight line with them produces a jagged, stuttery path. To fix this, the app keeps a rolling buffer of the last 6 pointer positions and renders them using quadratic Bézier curves — each segment curves smoothly through the midpoint between two consecutive positions. The result is a brushstroke that feels fluid even at low framerates.

The eraser uses globalCompositeOperation = 'destination-out' to punch a transparent hole in the drawing canvas rather than painting white over it, which means the video feed underneath shows through cleanly.




Running locally
bash
git clone https://github.com/your-username/ai-air-canvas
cd ai-air-canvas
npm install
npm run dev

Open http://localhost:5173 in Chrome or Edge. When the browser asks for camera permission, allow it. The MediaPipe model (~8MB) downloads from Google's CDN on first load — after that it's cached.

Firefox works but GPU delegation is unreliable; stick to a Chromium-based browser for the best tracking performance.


Toolbar tools
Tool	Description
🔴 🔵 🟢 🟡 ⚪	Switch brush colour
🧹 Eraser	Switch to erase mode (or use pinch gesture)
🗑️ Clear All	Wipe the entire canvas
💾 Save Image	Downloads your drawing as a PNG
Known limitations
Works best in good, even lighting — shadows on the hand confuse landmark detection
Only tracks one hand at a time
Very fast movements can outpace the tracker and leave gaps in lines
Safari is not supported (WebAssembly SIMD required by MediaPipe)
