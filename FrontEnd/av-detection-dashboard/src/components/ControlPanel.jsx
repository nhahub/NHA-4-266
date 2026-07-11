import { useRef } from 'react';
import { Camera, Square, Upload } from 'lucide-react';

/**
 * ControlPanel
 * ---------------------------------------------------------------------------
 * Pure UI component - source controls for the pipeline. All behavior is
 * delegated to the callbacks passed in from App.jsx; this component holds no
 * business logic of its own, only the hidden <input type="file"> ref needed
 * to trigger the native file picker.
 */
export default function ControlPanel({ isActive, onStartWebcam, onStop, onFileUpload }) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onFileUpload(file);
    event.target.value = ''; // allow re-selecting the same file again later
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-900 border border-slate-700 rounded-lg">
      <button
        type="button"
        onClick={onStartWebcam}
        disabled={isActive}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm
                   bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
                   hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10"
      >
        <Camera size={16} />
        Start Webcam
      </button>

      <button
        type="button"
        onClick={handleUploadClick}
        disabled={isActive}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm
                   bg-slate-800 text-slate-300 border border-slate-700
                   hover:bg-slate-750 hover:border-slate-600 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Upload size={16} />
        Upload Dashcam Video
      </button>
      {/* Hidden native file input, triggered programmatically by the button above */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={onStop}
        disabled={!isActive}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm
                   bg-red-500/10 text-red-400 border border-red-500/30
                   hover:bg-red-500/20 hover:border-red-500/50 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/10
                   sm:ml-auto"
      >
        <Square size={16} />
        Stop System
      </button>
    </div>
  );
}
