import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "VoiceOS \u2014 Local Voice Transcription",
  description:
    "Zero-cost, privacy-first, offline speech-to-text. Record or import audio, transcribe 100% on-device, and route the text to Notion, Sheets, Claude, ChatGPT, or any webhook.",
  applicationName: "VoiceOS",
  // No `manifest` field here \u2014 src/app/manifest.ts (Next's metadata-route
  // convention) generates /manifest.webmanifest and wires up the <link>
  // tag itself, correctly honoring `basePath` for subpath deployments.
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoiceOS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full min-h-screen bg-canvas font-sans text-white antialiased">
        <ToastProvider>
          {children}
          <ServiceWorkerRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
