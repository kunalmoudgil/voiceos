/// <reference lib="webworker" />

// Runs entirely off the main thread so transcription never janks the UI
// (critical on mid-range Android phones). Loads the model once, keeps it
// warm, and serves transcribe requests by id.

import { pipeline, env } from "@xenova/transformers";
import { CHUNK_LENGTH_S, STRIDE_LENGTH_S } from "./config";

// Never try to resolve models from a local server path — always go through
// the (cached) remote fetch + Cache Storage path, which is what gives us
// durable offline reuse after the first download.
env.allowLocalModels = false;
env.useBrowserCache = true;

type AsrPipeline = (
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<{ text: string } | { text: string }[]>;

type LoadMessage = { type: "load"; modelId: string };
type TranscribeMessage = { type: "transcribe"; id: string; pcm: Float32Array };
type IncomingMessage = LoadMessage | TranscribeMessage;

let pipelinePromise: Promise<AsrPipeline> | null = null;
let loadedModelId: string | null = null;

function post(message: unknown) {
  (self as unknown as Worker).postMessage(message);
}

function loadPipeline(modelId: string): Promise<AsrPipeline> {
  if (pipelinePromise && loadedModelId === modelId) return pipelinePromise;
  loadedModelId = modelId;
  pipelinePromise = pipeline("automatic-speech-recognition", modelId, {
    progress_callback: (progress: Record<string, unknown>) => {
      post({ type: "progress", payload: progress });
    },
  }) as unknown as Promise<AsrPipeline>;
  return pipelinePromise;
}

self.addEventListener("message", async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  if (msg.type === "load") {
    try {
      await loadPipeline(msg.modelId);
      post({ type: "ready" });
    } catch (err) {
      pipelinePromise = null;
      loadedModelId = null;
      post({
        type: "error",
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
    return;
  }

  if (msg.type === "transcribe") {
    try {
      if (!pipelinePromise) throw new Error("Model is not loaded yet.");
      const transcriber = await pipelinePromise;
      const output = await transcriber(msg.pcm, {
        chunk_length_s: CHUNK_LENGTH_S,
        stride_length_s: STRIDE_LENGTH_S,
      });
      const text = Array.isArray(output) ? output.map((o) => o.text).join(" ") : output.text;
      post({ type: "result", payload: { id: msg.id, text: text.trim() } });
    } catch (err) {
      post({
        type: "error",
        payload: {
          id: msg.id,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
});
