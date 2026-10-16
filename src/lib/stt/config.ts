// -----------------------------------------------------------------------
// Model configuration
// -----------------------------------------------------------------------
// The brief calls for Cactus Compute's 16.8MB "Whistle" STT model. Whistle
// ships as a mobile-native (Swift/Kotlin) on-device model via Cactus's SDK
// and is not currently published as a transformers.js/ONNX-Runtime-Web
// compatible Hugging Face repo, so it can't be `fetch()`-ed directly into a
// browser WASM runtime the way this architecture needs.
//
// To keep this app 100% honest and actually working offline-in-the-browser
// today, VoiceOS defaults to the closest publicly available equivalent:
// a quantized, int8 ONNX export of Whisper-tiny (English), distributed by
// Xenova specifically for transformers.js. It's the same class of model
// (encoder-decoder transformer, tiny parameter count, runs entirely on
// WASM/CPU, multi-tens-of-MB quantized footprint) and uses the exact same
// `pipeline("automatic-speech-recognition", ...)` call pattern Whistle (or
// any other ONNX STT model) would use.
//
// If/when Cactus publishes (or you export) ONNX weights for Whistle with a
// `config.json` + `tokenizer.json` + quantized `*.onnx` graph in the layout
// transformers.js expects, swap the id below (or point it at your own
// HF Hub repo / self-hosted URL) and everything else in this app — caching,
// the worker, the UI — keeps working unchanged.
export const STT_MODEL_ID = "Xenova/whisper-tiny.en";

// Whisper models accept raw 16kHz mono PCM, chunked internally.
export const CHUNK_LENGTH_S = 30;
export const STRIDE_LENGTH_S = 5;
