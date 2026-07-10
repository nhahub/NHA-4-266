import { useState } from 'react';
import { ScanEye } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import ControlPanel from './components/ControlPanel';
import TelemetrySidebar from './components/TelemetrySidebar';
import { useCamera } from './hooks/useCamera';
import { useInferencePipeline } from './hooks/useInferencePipeline';

export default function App() {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);

  const { videoRef, sourceType, isActive, error, startWebcam, loadVideoFile, stop } = useCamera();

  const { processedFrameUrl, detections, fps, isMocked, lastInferenceMs } = useInferencePipeline({
    videoRef,
    isActive,
    confidenceThreshold,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 py-4 flex items-center gap-3">
        <ScanEye className="text-emerald-400" size={24} strokeWidth={1.75} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Autonomous Vehicle Object Detection
          </h1>
          <p className="text-xs text-slate-500">Real-time perception dashboard</p>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <VideoPlayer
              videoRef={videoRef}
              isActive={isActive}
              processedFrameUrl={processedFrameUrl}
              detections={detections}
              isMocked={isMocked}
              sourceType={sourceType}
              error={error}
            />
            <ControlPanel
              isActive={isActive}
              onStartWebcam={startWebcam}
              onStop={stop}
              onFileUpload={loadVideoFile}
            />
          </div>

          <TelemetrySidebar
            isActive={isActive}
            fps={fps}
            confidenceThreshold={confidenceThreshold}
            onConfidenceChange={setConfidenceThreshold}
            detections={detections}
            lastInferenceMs={lastInferenceMs}
            isMocked={isMocked}
          />
        </div>
      </main>
    </div>
  );
}
