# Autonomous Vehicle Object Detection Dashboard

A production-ready React + Vite frontend for a real-time object detection
system. Captures frames from a webcam or an uploaded dashcam video, streams
them to a FastAPI inference backend at ~15fps, and renders the annotated
results with live telemetry.

The backend is not required to run this app: if no backend is configured (or
it's unreachable), the UI automatically falls back to displaying raw,
unannotated frames so you can develop and test the frontend in isolation.

## Tech stack

- React 18 + Vite
- Tailwind CSS
- lucide-react (icons)

## Architecture

```
src/
├── components/          Pure UI components (no business logic, no fetch calls)
│   ├── VideoPlayer.jsx       Central monitor - idle / initializing / active states
│   ├── ControlPanel.jsx      Start Webcam / Upload / Stop System controls
│   └── TelemetrySidebar.jsx  Status, FPS, latency, confidence slider, detections list
│
├── hooks/                Business logic, decoupled from rendering
│   ├── useCamera.js              Webcam + uploaded-file video source management
│   └── useInferencePipeline.js   The ~15fps capture -> encode -> infer loop
│
└── services/
    └── apiService.js     The ONLY file that talks to the network. Owns the
                           FastAPI contract, request/response shaping, and
                           the offline fallback behavior.
```

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Connecting your FastAPI backend

By default, `VITE_API_URL` is unset and the app runs in **simulation mode** -
a "Simulation Mode" badge appears on the video feed and frames are shown
unannotated.

To connect a real backend:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set `VITE_API_URL` to your FastAPI server's base URL:
   ```
   VITE_API_URL=http://localhost:8000
   ```
3. Restart `npm run dev`.

All network logic lives in `src/services/apiService.js`, marked with
`CHANGE FASTAPI URL HERE` comments. The expected API contract:

```
POST {VITE_API_URL}/predict
  body (multipart/form-data):
    frame:      Blob (JPEG image of the current frame)
    confidence: string (float, "0.10" - "1.00")

  response (application/json):
    {
      "image": "<base64 JPEG>",
      "detections": [
        { "id": "1", "label": "car", "confidence": 0.94, "bbox": [x, y, w, h] }
      ],
      "inference_time_ms": 42
    }
    // bbox is [x, y, width, height] as PERCENTAGES (0-100) of the frame,
    // so the bounding-box overlay doesn't need to know the backend's
    // native image resolution.

GET {VITE_API_URL}/health
  Lightweight reachability check.
```

A raw-image response (`content-type: image/jpeg`) with detections in an
`X-Detections` JSON header is also supported - see `apiService.js` for both
code paths.

## Deploying to Vercel

This repo includes a `vercel.json` configured for a Vite SPA (client-side
routing rewrites to `index.html`).

1. Push this project to a Git repository.
2. Import it in [Vercel](https://vercel.com/new).
3. Framework preset: **Vite** (auto-detected).
4. Add an Environment Variable: `VITE_API_URL` = your deployed FastAPI URL.
5. Deploy.

If you skip step 4, the deployed app will run in simulation mode until you
add the variable and redeploy.

## Notes on the processing loop

`useInferencePipeline.js` runs a `setInterval` at ~15fps. Each tick:

1. Draws the current `<video>` frame onto an off-screen `<canvas>`.
2. Exports it as a JPEG `Blob` (`canvas.toBlob`).
3. Sends it to `apiService.detectObjects()`.
4. If a request is still in flight when the next tick fires, that tick is
   skipped (frames are dropped, never queued) so a slow backend can't build
   up a backlog.
