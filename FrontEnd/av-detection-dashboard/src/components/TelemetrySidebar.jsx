import { Activity, Gauge, SlidersHorizontal, ScanLine, Timer } from 'lucide-react';

/**
 * TelemetrySidebar
 * ---------------------------------------------------------------------------
 * Pure UI component - displays real-time system metrics and exposes the
 * confidence threshold control. Receives all data and callbacks as props;
 * holds no state or business logic itself.
 */
export default function TelemetrySidebar({
  isActive,
  fps,
  confidenceThreshold,
  onConfidenceChange,
  detections = [],
  lastInferenceMs,
  isMocked,
}) {
  return (
    <aside className="flex flex-col w-full lg:w-80 bg-slate-900 border border-slate-700 rounded-lg p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
        Telemetry
      </h2>

      <MetricRow
        icon={<Activity size={16} />}
        label="System Status"
        value={
          <span
            className={`flex items-center gap-1.5 font-mono font-semibold ${
              isActive ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            {isActive ? 'ONLINE' : 'OFFLINE'}
          </span>
        }
      />

      <MetricRow
        icon={<Gauge size={16} />}
        label="Inference Speed"
        value={isActive ? `${fps} FPS` : '—'}
      />

      <MetricRow
        icon={<Timer size={16} />}
        label="Latency"
        value={isActive ? `${lastInferenceMs} ms` : '—'}
      />

      <MetricRow
        icon={<ScanLine size={16} />}
        label="Objects Detected"
        value={isActive ? detections.length : '—'}
        last
      />

      {/* Confidence threshold slider */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <SlidersHorizontal size={16} />
            Confidence Threshold
          </div>
          <span className="text-sm font-mono font-semibold text-emerald-400">
            {confidenceThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1.0}
          step={0.05}
          value={confidenceThreshold}
          onChange={(event) => onConfidenceChange(parseFloat(event.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer"
          aria-label="Confidence threshold"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
          <span>0.10</span>
          <span>1.00</span>
        </div>
      </div>

      {isMocked && isActive && (
        <div className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-800/40 rounded-md px-3 py-2 leading-relaxed">
          No inference backend connected — showing raw, unannotated frames. Set{' '}
          <code className="text-amber-300">VITE_API_URL</code> to enable live detection.
        </div>
      )}

      {isActive && detections.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Detected Objects
          </h3>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
            {detections.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between text-xs bg-slate-800/60 rounded px-2.5 py-1.5"
              >
                <span className="text-slate-300 capitalize">{d.label}</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(d.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function MetricRow({ icon, label, value, last = false }) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        last ? '' : 'border-b border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        {icon}
        {label}
      </div>
      <span className="text-sm font-mono font-semibold text-slate-200">{value}</span>
    </div>
  );
}
