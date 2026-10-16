"use client";

// Decodes any Blob/File the browser can demux (recorded webm/opus, imported
// wav/mp3/m4a, or video containers like .mov/.mp4 screen & call recordings)
// into mono 16kHz PCM Float32 samples — the format @xenova/transformers'
// Whisper pipeline expects. Everything happens with the standard Web Audio
// API, so there is no server round-trip and no extra WASM decoder dependency.
//
// Two decode paths:
//  1. Primary: `AudioContext.decodeAudioData()` — fast (not realtime-bound),
//     works for most plain audio files and many video containers.
//  2. Fallback: realtime capture via a hidden <video> element. WebKit/Safari
//     in particular is often stricter about demuxing multi-track video
//     containers (.mov especially) through `decodeAudioData` than it is
//     about playing that exact same file through a <video> element — this
//     is a well-known platform quirk, not a corrupt-file problem. When the
//     primary path fails on something that looks like a video, we play it
//     back muted/off-screen and tap the live audio graph with a
//     ScriptProcessorNode to capture PCM as it plays. This is bound to
//     real playback speed (a 2-minute clip takes ~2 minutes to extract).

export const TARGET_SAMPLE_RATE = 16000;

export interface DecodedAudio {
  pcm: Float32Array;
  durationSec: number;
}

export interface DecodeOptions {
  /**
   * Called once, synchronously, right before falling back to realtime
   * video-element audio extraction. Lets the caller swap in UI copy that
   * reflects this path running at real playback speed instead of near-
   * instant decode speed.
   */
  onFallback?: () => void;
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

/** Average N same-length channel buffers down to one mono buffer. Always
 * returns a fresh Float32Array, safe to retain beyond the caller's frame. */
function averageChannels(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0].slice();
  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (const data of channels) {
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channels.length;
    }
  }
  return mono;
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }
  return averageChannels(channels);
}

function isEffectivelySilent(samples: Float32Array): boolean {
  if (samples.length === 0) return true;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  // Conservative threshold: only catches true digital silence (the known
  // "muted element tap" failure mode), never a genuinely quiet recording.
  return rms < 1e-6;
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
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

const VIDEO_EXTENSIONS = /\.(mov|mp4|m4v|avi|webm|mkv|3gp|3g2)$/i;

/** Heuristic: should a decodeAudioData failure on this file trigger the
 * (slower, realtime) video-element fallback? Only video-shaped sources —
 * a genuinely corrupt .wav/.mp3 won't be rescued by playing it in a
 * <video> element, so there's no point paying that cost for those. */
function looksLikeVideo(source: Blob | File): boolean {
  const type = source.type || "";
  if (type.startsWith("video/")) return true;
  if (type.startsWith("audio/")) return false;
  // Some mobile file pickers (notably iOS Safari for .mov) hand back an
  // empty `type`. Fall back to the filename extension when we have one.
  const name = source instanceof File ? source.name.toLowerCase() : "";
  return VIDEO_EXTENSIONS.test(name);
}

/**
 * Play `source` back muted/off-screen in a hidden <video> element and
 * capture its audio in realtime via a ScriptProcessorNode tap, downmixing
 * to mono as frames arrive. Used only as a fallback when `decodeAudioData`
 * refuses to demux a video container directly.
 */
async function extractPCMFromMediaElementRealtime(source: Blob): Promise<DecodedAudio> {
  const AudioContextCtor = getAudioContextCtor();
  const objectUrl = URL.createObjectURL(source);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  Object.assign(video.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });
  video.setAttribute("aria-hidden", "true");
  video.src = objectUrl;
  document.body.appendChild(video);

  const audioContext = new AudioContextCtor();
  let sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let stallTimer: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (stallTimer) clearInterval(stallTimer);
    processor?.disconnect();
    sourceNode?.disconnect();
    silentGain?.disconnect();
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(objectUrl);
    audioContext.close().catch(() => undefined);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("The browser could not load this file for playback either.")),
        { once: true }
      );
    });

    const chunks: Float32Array[] = [];

    // IMPORTANT: tap via `captureStream()` + `createMediaStreamSource()`,
    // not `createMediaElementSource(video)`. In Chromium (and reportedly
    // other engines too), `createMediaElementSource` on a `muted` element
    // silently delivers all-zero samples to the Web Audio graph — a known
    // quirk, not something specific to this file. `muted` is required here
    // for guaranteed autoplay on iOS Safari (no user-activation requirement
    // for muted playback), so we can't just drop it; `captureStream()` taps
    // the element's actual decoded track data instead of its (muted)
    // playback-output path, sidestepping the issue entirely. Verified
    // against a real encoded clip: captureStream's captured RMS matches
    // decodeAudioData's RMS on the same source; createMediaElementSource's
    // did not (came back silent) when the element was muted.
    // `captureStream()` is broadly supported (Chrome/Edge/Safari 13+,
    // Android/iOS) but isn't yet in TypeScript's bundled DOM lib types.
    const captureStreamVideo = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
    };
    if (typeof captureStreamVideo.captureStream === "function") {
      const captured = captureStreamVideo.captureStream();
      const audioTracks = captured.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error("This video has no audio track to transcribe.");
      }
      sourceNode = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
    } else {
      // Older-engine fallback. May capture silence on browsers with the
      // muted-element quirk above; better than nothing on engines without
      // captureStream support at all.
      sourceNode = audioContext.createMediaElementSource(video);
    }
    // 4096-sample blocks, stereo in/out — Web Audio up-mixes mono sources
    // automatically, and averageChannels() collapses it back down anyway.
    processor = audioContext.createScriptProcessor(4096, 2, 2);
    silentGain = audioContext.createGain();
    silentGain.gain.value = 0; // capture the graph without audible playback

    let lastProgressAt = Date.now();
    processor.onaudioprocess = (event) => {
      lastProgressAt = Date.now();
      const input = event.inputBuffer;
      const channels: Float32Array[] = [];
      for (let ch = 0; ch < input.numberOfChannels; ch++) {
        channels.push(input.getChannelData(ch));
      }
      chunks.push(averageChannels(channels));
    };

    sourceNode.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    if (audioContext.state === "suspended") {
      await audioContext.resume().catch(() => undefined);
    }

    await new Promise<void>((resolve, reject) => {
      const onEnded = () => {
        cleanupListeners();
        resolve();
      };
      const onError = () => {
        cleanupListeners();
        reject(new Error("Playback failed while extracting audio from this video."));
      };
      const cleanupListeners = () => {
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("ended", onEnded, { once: true });
      video.addEventListener("error", onError, { once: true });

      // Playback can stall (e.g. an unseekable/odd stream) without ever
      // firing `error`. Bail out if we go 10s without a captured frame.
      stallTimer = setInterval(() => {
        if (Date.now() - lastProgressAt > 10000) {
          if (stallTimer) clearInterval(stallTimer);
          cleanupListeners();
          reject(new Error("Audio extraction stalled \u2014 playback did not progress."));
        }
      }, 2000);

      video.play().catch((err: unknown) => {
        cleanupListeners();
        reject(err instanceof Error ? err : new Error("Could not start playback for audio extraction."));
      });
    });

    const captured = concatFloat32(chunks);
    if (isEffectivelySilent(captured)) {
      // Guards the no-captureStream legacy branch above (and any other
      // engine-specific "muted elements tap as silence" quirk we haven't
      // hit yet) from silently producing an empty transcript.
      throw new Error(
        "Captured audio was silent \u2014 this browser may not support tapping a muted video's audio track."
      );
    }
    const durationSec = Number.isFinite(video.duration)
      ? video.duration
      : captured.length / audioContext.sampleRate;
    const pcm = await resampleTo16k(captured, audioContext.sampleRate);
    return { pcm, durationSec };
  } finally {
    cleanup();
  }
}

/**
 * Decode an audio or video file/blob into mono 16kHz PCM.
 *
 * Always tries the fast `decodeAudioData` path first, for every file type —
 * many video containers (standard mp4/webm) decode that way just fine. Only
 * on failure, and only for video-shaped sources, does it fall back to the
 * slower realtime `<video>` capture path (see `onFallback`).
 */
export async function decodeToPCM(
  source: Blob | File,
  options: DecodeOptions = {}
): Promise<DecodedAudio> {
  const arrayBuffer = await source.arrayBuffer();
  const AudioContextCtor = getAudioContextCtor();
  const ctx = new AudioContextCtor();
  let primaryError: unknown = null;
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const durationSec = audioBuffer.duration;
    const mono = downmixToMono(audioBuffer);
    const pcm = await resampleTo16k(mono, audioBuffer.sampleRate);
    return { pcm, durationSec };
  } catch (err) {
    primaryError = err;
  } finally {
    await ctx.close().catch(() => undefined);
  }

  // Primary path failed. Containers like .mov are often playable via
  // <video> even when decodeAudioData refuses to demux them directly — a
  // well-known WebKit/Safari strictness gap, not a corrupt-file problem.
  // Fall back to capturing the audio in realtime as the browser's own
  // media pipeline plays it.
  if (looksLikeVideo(source)) {
    try {
      options.onFallback?.();
      return await extractPCMFromMediaElementRealtime(source);
    } catch (fallbackErr) {
      throw new Error(
        `Could not extract audio from this video, even using the browser's own playback engine. ${
          fallbackErr instanceof Error ? fallbackErr.message : ""
        } Try trimming the clip or re-exporting it, then import again.`.trim()
      );
    }
  }

  throw new Error(
    `Could not decode this file's audio track. ${
      primaryError instanceof Error ? primaryError.message : ""
    } Try exporting it as .wav, .mp3, or .m4a and re-importing.`.trim()
  );
}
