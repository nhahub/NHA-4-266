/**
 * apiService.js
 * ---------------------------------------------------------------------------
 * The data layer. This is the ONLY file in the app that talks to the network.
 * Components and hooks never call `fetch` directly - they call the functions
 * exported here.
 *
 * Backend contract (FastAPI, not built yet):
 *   POST {VITE_API_URL}/predict
 *     body: multipart/form-data
 *       - frame: Blob (JPEG image of the current video frame)
 *       - confidence: string (float, "0.10" - "1.00")
 *     response (application/json):
 *       {
 *         "image": "<base64 JPEG, optionally with data-URI prefix>",
 *         "detections": [
 *           { "id": "1", "label": "car", "confidence": 0.94, "bbox": [x, y, w, h] }
 *         ],
 *         "inference_time_ms": 42
 *       }
 *       bbox is expected as [x, y, width, height] in PERCENTAGE units (0-100)
 *       relative to the frame, so the overlay can be drawn without knowing
 *       the backend's native resolution.
 *
 *     The backend may instead respond with a raw annotated image
 *     (content-type: image/jpeg) and put detections in an `X-Detections`
 *     JSON header - both response shapes are handled below.
 *
 *   GET {VITE_API_URL}/health
 *     Used for a lightweight "is the backend reachable" ping.
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// CHANGE FASTAPI URL HERE
// Set VITE_API_URL in a local `.env` file (see `.env.example`) and in your
// Vercel project's Environment Variables. Example:
//   VITE_API_URL=https://your-fastapi-backend.onrender.com
// Leave it unset to run the UI in standalone/simulation mode.
// ============================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;
const PREDICT_ENDPOINT = '/predict';
const HEALTH_ENDPOINT = '/health';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * @typedef {Object} Detection
 * @property {string} id
 * @property {string} label
 * @property {number} confidence
 * @property {[number, number, number, number]} bbox - [x, y, w, h] in % of frame
 */

/**
 * @typedef {Object} InferenceResult
 * @property {boolean} success
 * @property {boolean} mocked - true if this came from the fallback path, not a real backend
 * @property {string=} reason - why the fallback was used, when mocked === true
 * @property {Blob} image - the frame to display (annotated if a backend answered, raw otherwise)
 * @property {Detection[]} detections
 * @property {number} inferenceTimeMs
 * @property {number} confidenceThreshold
 * @property {number} timestamp
 */

/**
 * Sends a single video frame to the FastAPI inference backend and returns
 * the annotated result.
 *
 * IMPORTANT FALLBACK BEHAVIOR: if VITE_API_URL is not configured, or the
 * request fails for any reason (backend offline, CORS, timeout, non-2xx
 * response), this function NEVER throws. It resolves with the original,
 * unannotated frame so the UI keeps rendering during frontend-only testing.
 *
 * @param {Blob} frameBlob - JPEG blob of the current frame
 * @param {number} [confidenceThreshold=0.5] - 0.1 - 1.0
 * @returns {Promise<InferenceResult>}
 */
export async function detectObjects(frameBlob, confidenceThreshold = 0.5) {
  const startedAt = performance.now();

  // ---- Fallback path #1: no backend configured at all --------------------
  if (!API_BASE_URL) {
    return buildFallbackResult(frameBlob, startedAt, 'VITE_API_URL is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('frame', frameBlob, `frame-${Date.now()}.jpg`);
    formData.append('confidence', confidenceThreshold.toString());

    // CHANGE FASTAPI URL HERE - this is the actual POST request to your backend.
    // FormData sets its own multipart Content-Type header automatically, so
    // we intentionally don't set one here.
    const response = await fetch(`${API_BASE_URL}${PREDICT_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Inference server responded with HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = await response.json();
      return {
        success: true,
        mocked: false,
        image: payload.image ? base64ToBlob(payload.image) : frameBlob,
        detections: normalizeDetections(payload.detections),
        inferenceTimeMs: payload.inference_time_ms ?? Math.round(performance.now() - startedAt),
        confidenceThreshold,
        timestamp: Date.now(),
      };
    }

    // Backend returned the annotated image directly as bytes.
    const annotatedBlob = await response.blob();
    let headerDetections = [];
    try {
      headerDetections = JSON.parse(response.headers.get('x-detections') || '[]');
    } catch {
      headerDetections = [];
    }

    return {
      success: true,
      mocked: false,
      image: annotatedBlob,
      detections: normalizeDetections(headerDetections),
      inferenceTimeMs: Math.round(performance.now() - startedAt),
      confidenceThreshold,
      timestamp: Date.now(),
    };
  } catch (error) {
    // ---- Fallback path #2: fetch failed (offline / CORS / timeout / 5xx) -
    const reason = error?.name === 'AbortError' ? 'Request timed out' : error.message;
    console.warn(`[apiService] Falling back to raw frame - ${reason}`);
    return buildFallbackResult(frameBlob, startedAt, reason);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lightweight reachability check for the "System Status" indicator.
 * Never throws - resolves to { online: false } on any failure.
 */
export async function checkBackendHealth() {
  if (!API_BASE_URL) {
    return { online: false, reason: 'VITE_API_URL is not set' };
  }
  try {
    // CHANGE FASTAPI URL HERE - health check endpoint
    const response = await fetch(`${API_BASE_URL}${HEALTH_ENDPOINT}`, { method: 'GET' });
    return { online: response.ok };
  } catch (error) {
    return { online: false, reason: error.message };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildFallbackResult(frameBlob, startedAt, reason) {
  return {
    success: true,
    mocked: true,
    reason,
    image: frameBlob, // raw, unannotated - keeps the UI alive during testing
    detections: [],
    inferenceTimeMs: Math.round(performance.now() - startedAt),
    confidenceThreshold: undefined,
    timestamp: Date.now(),
  };
}

function normalizeDetections(rawDetections) {
  if (!Array.isArray(rawDetections)) return [];
  return rawDetections.map((d, index) => ({
    id: d.id ?? `${Date.now()}-${index}`,
    label: d.label ?? 'object',
    confidence: typeof d.confidence === 'number' ? d.confidence : 0,
    bbox: Array.isArray(d.bbox) && d.bbox.length === 4 ? d.bbox : [0, 0, 0, 0],
  }));
}

function base64ToBlob(base64String, mime = 'image/jpeg') {
  const cleaned = base64String.replace(/^data:image\/\w+;base64,/, '');
  const byteChars = atob(cleaned);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}
