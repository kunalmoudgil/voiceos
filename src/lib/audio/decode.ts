"use client";

// Decodes any Blob/File the browser can demux (recorded webm/opus, imported
// m4a/mp3/wav, or the audio track inside an mp4/mov screen recording) into
// mono 16kHz PCM Float32 samples — the format @xenova/transformers' Whisper
// pipeline expects. Everything happens with the standard Web Audio API, so
// there is no server round-trip and no extra WASM decoder dependency.

export const TARGET_SAMPLE_RATE = 16000;

export interface DecodedAudio {
  pcm: Float32Array;
  durationSec: number;
}

function getAudioContextCtor(): typeof AudioContext {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const ctor = w.AudioContext || w.webkitAudioContext;
  if (!ctor) throw new Error("Web Audio API is not supported in this browser.");
  return ctor;
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0).slice();
  }
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return mono;
}

async function resampleTo16k(mono: Float32Array, sourceRate: number): Promise<Float32Array> {
  if (sourceRate === TARGET_SAMPLE_RATE) return mono;

  const targetLength = Math.ceil((mono.length * TARGET_SAMPLE_RATE) / sourceRate);
  const OfflineCtor =
    (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
      .OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!OfflineCtor) {
    throw new Error("OfflineAudioContext is not supported in this browser.");
  }

  const offlineCtx = new OfflineCtor(1, targetLength, TARGET_SAMPLE_RATE);
  const buffer = offlineCtx.createBuffer(1, mono.length, sourceRate);
  buffer.copyToChannel(mono as Float32Array<ArrayBuffer>, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0).slice();
}

/**
 * Decode an audio or video file/blob into mono 16kHz PCM.
 *
 * Works for: recorded webm/opus (live dictation), wav/mp3/m4a/aac imports,
 * and the audio track of mp4/mov screen recordings (as long as the browser's
 * media decoder can demux that container — true for Safari/Chrome on modern
 * iOS/Android for standard H.264+AAC screen recordings).
 */
export async function decodeToPCM(source: Blob | File): Promise<DecodedAudio> {
  const arrayBuffer = await source.arrayBuffer();
  const AudioContextCtor = getAudioContextCtor();
  const ctx = new AudioContextCtor();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const durationSec = audioBuffer.duration;
    const mono = downmixToMono(audioBuffer);
    const pcm = await resampleTo16k(mono, audioBuffer.sampleRate);
    return { pcm, durationSec };
  } catch (err) {
    throw new Error(
      `Could not decode this file's audio track. ${
        err instanceof Error ? err.message : ""
      } Try exporting it as .wav, .mp3, or .m4a and re-importing.`.trim()
    );
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
