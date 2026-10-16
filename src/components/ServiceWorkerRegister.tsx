"use client";

import { useEffect } from "react";

// Inlined at build time by Next.js. Set NEXT_PUBLIC_BASE_PATH when
// deploying under a subpath (e.g. GitHub Pages project sites) so the SW
// registers at the right scope. Empty string for root deployments.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, {
          scope: `${BASE_PATH}/`,
        });
      } catch (err) {
        console.warn("VoiceOS: service worker registration failed", err);
      }
    };

    // Register after load so it never competes with the initial render /
    // model download for bandwidth or main-thread time.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
