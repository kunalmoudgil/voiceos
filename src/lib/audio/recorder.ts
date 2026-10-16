"use client";

// Thin, framework-free wrapper around MediaRecorder + an AnalyserNode so the
// `useRecorder` hook (and the waveform visualizer) stay simple. Deliberately
// does NOT connect the analyser to the audio destination, to avoid feedback.

export interface LiveRecordingHandle {
  analyser: AnalyserNode;
  stream: MediaStream;
  stop: () => Promise<{ blob: Blob; durationSec: number }>;
  cancel: () => void;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported?.(c));
}

export async function startLiveRecording(): Promise<LiveRecordingHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);

  const mimeType = pickMimeType();
  const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = performance.now();

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  mediaRecorder.start(250);

  const cleanup = () => {
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
    analyser.disconnect();
    audioContext.close().catch(() => undefined);
  };

  const stop = () =>
    new Promise<{ blob: Blob; durationSec: number }>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        try {
          const durationSec = (performance.now() - startedAt) / 1000;
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          cleanup();
          resolve({ blob, durationSec });
        } catch (err) {
          reject(err);
        }
      };
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    });

  const cancel = () => {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
    if (mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    cleanup();
  };

  return { analyser, stream, stop, cancel };
}
