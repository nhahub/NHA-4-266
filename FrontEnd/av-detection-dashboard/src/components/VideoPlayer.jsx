import { VideoOff, Radio, TriangleAlert, ScanEye } from 'lucide-react';

/**
 * VideoPlayer
 * ---------------------------------------------------------------------------
 * Pure UI component - the central monitor. Handles two visual states:
 *   1. Waiting for input (no active source yet)
 *   2. Active stream (renders the latest processed frame + detection boxes)
 *
 * The raw <video> element is always mounted (opacity-0) so the inference
 * pipeline can read frames from it, even though the visible surface is the
 * processed frame image returned by the backend (or the fallback raw frame).
 */
export default function VideoPlayer({
  videoRef,
  isActive,
  processedFrameUrl,
  detections = [],
  isMocked,
  sourceType,
  error,
}) {
  return (
    <div className="relative w-full flex-1 min-h-[420px] bg-black rounded-lg border border-slate-700 overflow-hidden">
      {/* Raw source video - always in the DOM so canvas capture works, never shown directly */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain opacity-0 pointer-events-none"
        playsInline
        muted
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {!isActive && <IdleState />}

        {isActive && !processedFrameUrl && <InitializingState />}

        {isActive && processedFrameUrl && (
          <ActiveStream
            processedFrameUrl={processedFrameUrl}
            detections={detections}
            isMocked={isMocked}
            sourceType={sourceType}
          />
        )}
      </div>

      {error && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-red-950/90 backdrop-blur px-3 py-2 rounded-md border border-red-800/60">
          <TriangleAlert size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">{error}</span>
        </div>
      )}
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-600 px-6 text-center">
      <VideoOff size={52} strokeWidth={1.5} />
      <p className="text-sm font-semibold tracking-wide uppercase text-slate-500">
        Awaiting Input Source
      </p>
      <p className="text-xs text-slate-600 max-w-xs">
        Start the webcam or upload a dashcam video to begin object detection.
      </p>
    </div>
  );
}

function InitializingState() {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <ScanEye size={52} strokeWidth={1.5} className="animate-pulse text-emerald-400/70" />
      <p className="text-sm font-medium tracking-wide uppercase">Initializing Stream…</p>
    </div>
  );
}

function ActiveStream({ processedFrameUrl, detections, isMocked, sourceType }) {
  return (
    <div className="relative w-full h-full">
      <img
        src={processedFrameUrl}
        alt="Processed detection feed"
        className="w-full h-full object-contain"
      />

      {/* Detection bounding boxes. bbox is [x, y, w, h] as % of frame dimensions. */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {detections.map((d) => (
          <g key={d.id}>
            <rect
              x={d.bbox[0]}
              y={d.bbox[1]}
              width={d.bbox[2]}
              height={d.bbox[3]}
              fill="none"
              className="stroke-emerald-400"
              strokeWidth="0.35"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {/* Detection labels, positioned in a regular (non-scaled) overlay layer */}
      <div className="absolute inset-0 pointer-events-none">
        {detections.map((d) => (
          <span
            key={d.id}
            className="absolute -translate-y-full text-[10px] font-mono font-semibold text-slate-950 bg-emerald-400 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
            style={{ left: `${d.bbox[0]}%`, top: `${d.bbox[1]}%` }}
          >
            {d.label} {Math.round(d.confidence * 100)}%
          </span>
        ))}
      </div>

      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-md border border-slate-700">
        <Radio size={13} className="text-emerald-400 animate-pulse" />
        <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
          {sourceType === 'webcam' ? 'Live Webcam' : 'Dashcam Playback'}
        </span>
      </div>

      {isMocked && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-amber-950/85 backdrop-blur px-3 py-1.5 rounded-md border border-amber-700/50">
          <TriangleAlert size={13} className="text-amber-400" />
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Simulation Mode
          </span>
        </div>
      )}
    </div>
  );
}
