/**
 * VoiceOS Service Worker
 * ------------------------------------------------------------------------
 * Goals:
 *  1. Make the app shell (HTML/CSS/JS/manifest/icons) available offline
 *     after the first successful visit, so VoiceOS behaves like a native
 *     app once installed ("Add to Home Screen").
 *  2. Give the ~17MB Whistle STT model (and the ONNX Runtime WASM backend
 *     it depends on) a durable, explicit cache so transcription keeps
 *     working with zero network access after the first load. (In addition
 *     to this, @xenova/transformers also manages its own browser cache —
 *     this SW layer is a belt-and-suspenders guarantee.)
 *  3. Never intercept non-GET requests (webhook POSTs to Notion/Zapier/etc.
 *     must always hit the real network — they're not something we cache).
 *
 * This SW intentionally avoids a bundler-generated precache manifest
 * (Workbox-style) to stay dependency-free. Instead it opportunistically
 * caches whatever the app actually requests, which is sufficient for a
 * single-page app shell.
 */

const VERSION = "v1";
const APP_SHELL_CACHE = `voiceos-shell-${VERSION}`;
const MODEL_CACHE = `voiceos-model-${VERSION}`;
const CURRENT_CACHES = [APP_SHELL_CACHE, MODEL_CACHE];

// Hosts that serve the on-device model weights / ONNX runtime WASM.
const MODEL_HOSTS = [
  "huggingface.co",
  "cdn-lfs.huggingface.co",
  "cdn-lfs-us-1.huggingface.co",
  "cdn-lfs-us-2.huggingface.co",
  "cdn.jsdelivr.net",
  "unpkg.com",
];

const SHELL_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      // Best-effort: don't fail install if any of these are briefly
      // unavailable (e.g. first deploy, dev server quirks).
      await Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch(() => {
            /* ignore */
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("voiceos-") && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkPromise) || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET requests (routing webhooks, API calls, etc.)
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    if (request.mode === "navigate") {
      event.respondWith(networkFirst(request, APP_SHELL_CACHE));
      return;
    }
    // Static assets: JS/CSS chunks, icons, manifest.
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
    return;
  }

  if (MODEL_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  // Everything else (webhook destinations, deep links, etc.) — don't touch.
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
