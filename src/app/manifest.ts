import type { MetadataRoute } from "next";

// Next's metadata-route convention: emitted as /manifest.webmanifest at
// build time (works fine with `output: "export"`) and automatically
// prefixed with `basePath`/`assetPrefix` if you deploy under a subpath
// (e.g. GitHub Pages' username.github.io/repo), unlike a hand-written
// public/manifest.json whose root-absolute icon paths would break there.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoiceOS \u2014 Local Voice Transcription",
    short_name: "VoiceOS",
    description:
      "Zero-cost, privacy-first, offline speech-to-text. Record or import audio, transcribe 100% on-device, and route the text wherever you work.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
