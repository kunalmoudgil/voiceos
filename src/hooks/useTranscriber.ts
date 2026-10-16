"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineStatus, TranscribeProgressEvent } from "@/types";
import { sttEngine } from "@/lib/stt/engine";

interface FileProgress {
  file: string;
  progress: number;
  status: string;
}

export function useTranscriber(autoLoad = true) {
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [filesProgress, setFilesProgress] = useState<Record<string, FileProgress>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (!sttEngine) {
      setLoadError("On-device transcription isn't supported in this browser.");
      setStatus("error");
      return;
    }
    try {
      setLoadError(null);
      await sttEngine.load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load the speech model.");
    }
  }, []);

  useEffect(() => {
    if (!sttEngine) return;
    const unsubStatus = sttEngine.onStatusChange(setStatus);
    const unsubProgress = sttEngine.onProgress((event: TranscribeProgressEvent) => {
      if (!event.file) return;
      setFilesProgress((prev) => ({
        ...prev,
        [event.file as string]: {
          file: event.file as string,
          progress: event.progress ?? prev[event.file as string]?.progress ?? 0,
          status: event.status,
        },
      }));
    });
    setStatus(sttEngine.getStatus());
    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  useEffect(() => {
    if (autoLoad && !startedRef.current) {
      startedRef.current = true;
      ensureLoaded();
    }
  }, [autoLoad, ensureLoaded]);

  const transcribe = useCallback(async (pcm: Float32Array): Promise<string> => {
    if (!sttEngine) throw new Error("On-device transcription isn't supported in this browser.");
    return sttEngine.transcribe(pcm);
  }, []);

  const overallProgress = (() => {
    const values = Object.values(filesProgress);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, f) => sum + f.progress, 0) / values.length);
  })();

  return {
    status,
    filesProgress,
    overallProgress,
    loadError,
    ensureLoaded,
    transcribe,
  };
}
