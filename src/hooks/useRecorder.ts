"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startLiveRecording, type LiveRecordingHandle } from "@/lib/audio/recorder";

export interface RecorderResult {
  blob: Blob;
  durationSec: number;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<LiveRecordingHandle | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const handle = await startLiveRecording();
      handleRef.current = handle;
      startTimeRef.current = performance.now();
      setElapsedSec(0);
      setIsRecording(true);
      intervalRef.current = setInterval(() => {
        setElapsedSec((performance.now() - startTimeRef.current) / 1000);
      }, 200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access the microphone. Check browser permissions."
      );
      setIsRecording(false);
    }
  }, []);

  const stop = useCallback(async (): Promise<RecorderResult | null> => {
    clearTimer();
    const handle = handleRef.current;
    handleRef.current = null;
    setIsRecording(false);
    if (!handle) return null;
    try {
      return await handle.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed.");
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    handleRef.current?.cancel();
    handleRef.current = null;
    setIsRecording(false);
    setElapsedSec(0);
  }, []);

  useEffect(() => () => {
    clearTimer();
    handleRef.current?.cancel();
  }, []);

  return {
    isRecording,
    elapsedSec,
    error,
    start,
    stop,
    cancel,
    getAnalyser: () => handleRef.current?.analyser ?? null,
  };
}
