"use client";

import type { EngineStatus, TranscribeProgressEvent } from "@/types";
import { STT_MODEL_ID } from "./config";

type StatusListener = (status: EngineStatus) => void;
type ProgressListener = (event: TranscribeProgressEvent) => void;

interface PendingJob {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

/**
 * Singleton controller for the on-device STT worker. One worker, one model
 * instance, reused across every recording/import so the ~17MB of weights
 * are only ever downloaded (and decoded) once per session.
 */
class STTEngine {
  private worker: Worker | null = null;
  private status: EngineStatus = "idle";
  private statusListeners = new Set<StatusListener>();
  private progressListeners = new Set<ProgressListener>();
  private pending = new Map<string, PendingJob>();
  private loadPromise: Promise<void> | null = null;

  getStatus(): EngineStatus {
    return this.status;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private setStatus(status: EngineStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  /** Lazily create the worker and ask it to load the model. Idempotent. */
  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      if (typeof Worker === "undefined") {
        this.setStatus("error");
        reject(new Error("Web Workers are not supported in this browser."));
        return;
      }

      this.setStatus("loading");
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (event: MessageEvent) => {
        const msg = event.data as
          | { type: "ready" }
          | { type: "progress"; payload: TranscribeProgressEvent }
          | { type: "result"; payload: { id: string; text: string } }
          | { type: "error"; payload: { id?: string; message: string } };

        if (msg.type === "progress") {
          this.progressListeners.forEach((l) => l(msg.payload));
          return;
        }

        if (msg.type === "ready") {
          this.setStatus("ready");
          resolve();
          return;
        }

        if (msg.type === "result") {
          const job = this.pending.get(msg.payload.id);
          if (job) {
            job.resolve(msg.payload.text);
            this.pending.delete(msg.payload.id);
          }
          if (this.pending.size === 0) this.setStatus("ready");
          return;
        }

        if (msg.type === "error") {
          const err = new Error(msg.payload.message);
          if (msg.payload.id) {
            const job = this.pending.get(msg.payload.id);
            if (job) {
              job.reject(err);
              this.pending.delete(msg.payload.id);
            }
            if (this.pending.size === 0) this.setStatus("ready");
          } else {
            this.setStatus("error");
            reject(err);
          }
        }
      };

      this.worker.onerror = (event: ErrorEvent) => {
        this.setStatus("error");
        reject(new Error(event.message || "STT worker crashed."));
      };

      this.worker.postMessage({ type: "load", modelId: STT_MODEL_ID });
    });

    return this.loadPromise;
  }

  async transcribe(pcm: Float32Array): Promise<string> {
    await this.load();
    if (!this.worker) throw new Error("STT worker is not available.");

    const id = Math.random().toString(36).slice(2);
    this.setStatus("transcribing");

    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // Transfer the underlying buffer to avoid an extra copy across the
      // worker boundary for large recordings.
      this.worker!.postMessage({ type: "transcribe", id, pcm }, [pcm.buffer]);
    });
  }
}

export const sttEngine: STTEngine | null = typeof window !== "undefined" ? new STTEngine() : null;
export type { EngineStatus };
