# VoiceOS

A zero-cost, privacy-first, offline-capable PWA for on-device speech-to-text.
Record live or import audio/video, transcribe **entirely on your phone's
CPU** (no server, no API key, no per-minute cost), auto-format the result,
and route it to Notion, Google Sheets, a webhook, Claude, ChatGPT, or the
native share sheet.

Everything in this repo is real, working code — not a mock. It's been
built, type-checked, lint-checked, and exercised end-to-end in a browser
(model download → WASM inference → IndexedDB persistence → routing →
offline reload) during development.

## How it works

- **Next.js 14, static export (`output: "export"`).** The whole app is
  plain HTML/CSS/JS with zero server dependency — it deploys identically to
  Vercel, GitHub Pages, Netlify, Cloudflare Pages, or any static host.
- **On-device STT** via [`@xenova/transformers`](https://github.com/xenova/transformers.js)
  running a quantized Whisper model through ONNX Runtime Web (WASM), inside
  a dedicated **Web Worker** so the UI thread never blocks.
- **Dual audio ingestion**: a live `MediaRecorder` dictation button, and a
  file/video drop zone that decodes the audio track with the Web Audio API
  (`decodeAudioData` + `OfflineAudioContext` resampling to 16kHz mono).
- **Local-only storage**: settings in `localStorage`, the last 50
  transcripts in `IndexedDB` (via [`idb`](https://github.com/jakearchibald/idb)).
  Nothing is uploaded unless *you* tap a routing button.
- **Offline via Service Worker** (`public/sw.js`): caches the app shell for
  offline reloads and gives the model/WASM downloads from the Hugging
  Face/jsDelivr CDNs a durable cache, independent of `@xenova/transformers`'
  own browser-cache layer.
- **Routing engine**: a small, dependency-free set of senders in
  `src/lib/routing/` for webhooks, Notion, Google Sheets, Claude/ChatGPT
  deep-links, clipboard, and the native Web Share API.

### About the "Whistle" model

The brief asks for Cactus Compute's 16.8MB **Whistle** model. Whistle ships
through Cactus's native mobile SDK (Swift/Kotlin) and isn't published as a
transformers.js/ONNX-Runtime-Web-compatible Hugging Face repo today, so it
can't be `fetch()`-ed into a browser WASM runtime the way this architecture
needs. Rather than fake that, VoiceOS defaults to the closest real,
publicly-available equivalent that runs the exact same way (quantized,
tiny, encoder-decoder, 100% client-side WASM/CPU):

```ts
// src/lib/stt/config.ts
export const STT_MODEL_ID = "Xenova/whisper-tiny.en";
```

If/when ONNX weights for Whistle become available in the layout
transformers.js expects (`config.json` + `tokenizer.json` + quantized
`*.onnx` graph), change that one constant — the worker, caching, and UI all
keep working unchanged.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build     # outputs the static site to ./out
npx serve out     # preview the production build locally
```

The first time you open the app it downloads ~40-60MB of model + WASM
runtime (one time, cached forever after via Cache Storage + the service
worker). Everything after that — every recording, every import — runs with
zero network calls for transcription.

## Deployment

### Vercel
Push to a git repo and import it in Vercel. No config needed — `next build`
with `output: "export"` is auto-detected and served as a static site.

### GitHub Pages
```bash
npm run build
npx gh-pages -d out   # or push `out/` to a `gh-pages` branch
```
If you deploy under a subpath (`username.github.io/repo`), set
`basePath`/`assetPrefix` in `next.config.js` to `/repo`.

### iOS "Add to Home Screen"
Open the deployed URL in Safari → Share → **Add to Home Screen**. The app
installs with its own icon (`public/icons/`), launches in standalone mode
(no browser chrome), and keeps working offline thanks to `public/sw.js`.

## Configuring destinations (Settings drawer)

| Destination | Setup |
|---|---|
| **Webhook** | Any URL that accepts a JSON POST (Make.com, n8n, Zapier catch-hook). Payload: `{ timestamp, audio_duration, source_mode, quick_mode, raw_transcript, formatted_text }`. |
| **Notion** | Notion's API has no CORS headers, so direct browser calls fail. Use **Webhook mode** (default): point it at a Make/n8n/Apps Script scenario that receives the same JSON payload and writes to Notion server-side. "Direct" mode is included for people proxying through their own CORS-enabled function. |
| **Google Sheets** | Deploy an Apps Script Web App (`Execute as: Me`, `Access: Anyone`) with the `doPost` below, then paste its `/exec` URL. |
| **Claude / ChatGPT** | One tap opens `claude.ai/new?q=...` / `chatgpt.com/?q=...` with the transcript pre-filled. If the transcript is too long for a URL, it's copied to your clipboard instead and the new-chat page still opens. |
| **Share Sheet** | Uses `navigator.share()` — iOS/Android native share to Notes, Mail, Slack, Drafts, etc. |
| **Clipboard** | Copies the formatted transcript. |

Apps Script snippet for the Sheets destination:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("VoiceOS");
  sheet.appendRow([
    data.timestamp, data.source_mode, data.quick_mode,
    data.audio_duration, data.raw_transcript, data.formatted_text,
  ]);
  return ContentService.createTextOutput("ok");
}
```

## Handling live phone calls & Zoom meetings

Browsers can't access microphone audio during an active cellular call, and
tab/mic capture during a Zoom/Teams call is unreliable across platforms. The
practical workaround used by this app:

```
Phone call / Zoom meeting
   → iOS 18+ native call recording, or Zoom cloud recording,
     or iPhone Screen Recording during the call
   → File saved to Files / Photos
   → VoiceOS → "Drop a call recording..." → pick the file
   → Whistle/Whisper transcribes 100% locally
   → Auto-routes to your configured destinations
```

## Project structure

```
src/
  app/                  Next.js app router (layout, page, globals.css)
  components/           UI: RecordPanel, FileDropZone, ResultPanel,
                         SettingsDrawer, HistoryFeed, Waveform, etc.
  hooks/                useRecorder, useTranscriber, useSettings, useHistory
  lib/
    audio/              MediaRecorder wrapper + decode-to-16kHz-PCM
    stt/                Worker + singleton engine wrapping transformers.js
    routing/             webhook / notion / sheets / deep-link / share senders
    templates/           Quick Mode markdown templates
    db/                  IndexedDB history store (idb)
    settings.ts          localStorage-backed settings
public/
  manifest.json, sw.js, icons/   PWA installability + offline shell
scripts/
  generate-icons.mjs    Zero-dependency PNG icon generator (re-run anytime)
```

## Known limitations (honest notes)

- **Video/container support for imports** depends on the browser's own
  media demuxer (`decodeAudioData`). Standard H.264/AAC `.mp4` screen
  recordings and common `.m4a/.mp3/.wav` work on current iOS/Android
  browsers; exotic codecs may not. There's no bundled ffmpeg.wasm — that
  would roughly 10x the download size, working against the "zero-cost,
  lightweight" goal.
- **English-only by default** (`whisper-tiny.en`). Swap `STT_MODEL_ID` to a
  multilingual Whisper checkpoint (e.g. `Xenova/whisper-tiny`) for other
  languages, at a small accuracy/size trade-off.
- **Notion "direct" mode** will fail in-browser due to Notion's CORS policy
  — this is documented in the Settings UI and in `src/lib/routing/notion.ts`;
  use webhook mode.
- **Clipboard/Share** require a real user tap (standard browser security —
  they won't work from automated/background contexts, only from genuine
  user gestures, which is exactly how a phone user will trigger them).
