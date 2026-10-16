"use client";

import { useRecorder, type RecorderResult } from "@/hooks/useRecorder";
import { Waveform } from "./Waveform";
import { formatDuration } from "@/lib/utils";

interface RecordPanelProps {
  onRecordingComplete: (result: RecorderResult) => void;
  disabled?: boolean;
}

export function RecordPanel({ onRecordingComplete, disabled }: RecordPanelProps) {
  const recorder = useRecorder();

  const handleClick = async () => {
    if (recorder.isRecording) {
      const result = await recorder.stop();
      if (result) onRecordingComplete(result);
    } else {
      await recorder.start();
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-6">
      <Waveform
        getAnalyser={recorder.getAnalyser}
        active={recorder.isRecording}
        className="h-16 w-full"
      />

      <div className="relative flex items-center justify-center">
        {recorder.isRecording && (
          <span className="absolute h-20 w-20 rounded-full bg-danger/40 animate-pulseRing" />
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled && !recorder.isRecording}
          aria-label={recorder.isRecording ? "Stop recording" : "Start recording"}
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
            recorder.isRecording
              ? "border-danger bg-danger/20 text-danger"
              : "border-accent bg-accent/15 text-accent shadow-glow hover:bg-accent/25"
          }`}
        >
          {recorder.isRecording ? <StopIcon /> : <MicIcon />}
        </button>
      </div>

      <div className="text-center">
        <p className="font-mono text-lg tabular-nums text-white">
          {recorder.isRecording ? formatDuration(recorder.elapsedSec) : "0:00"}
        </p>
        <p className="text-sm text-white/50">
          {recorder.isRecording ? "Recording\u2026 tap to stop" : "Tap to record a live note"}
        </p>
      </div>

      {recorder.error && <p className="max-w-xs text-center text-sm text-danger">{recorder.error}</p>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}
