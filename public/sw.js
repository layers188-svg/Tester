// House Dark service worker.
//
// Spoiler security rule (brief §11): a cached response must never be
// able to carry a film title. So this worker only ever caches truly
// static, member-independent assets — icons, fonts, the manifest — and
// is deliberately network-only for every navigation and every /api/*
// request, including everything under /tonight, /circle, /library,
// /you, /desk. When in doubt here, do not cache it.

const CACHE_NAME = "house-dark-static-v1";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const CACHEABLE_PATH_PREFIXES = ["/icons/", "/fonts/"];
const CACHEABLE_EXACT_PATHS = new Set(["/manifest.webmanifest", "/favicon.png"]);

function isCacheableStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (CACHEABLE_EXACT_PATHS.has(url.pathname)) return true;
  return CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // never intercept mutations

  const url = new URL(request.url);

  if (!isCacheableStaticAsset(url)) {
    // Network only — this covers every page (including /tonight) and
    // every /api/* route. No opaque or dynamic response is ever cached.
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});
