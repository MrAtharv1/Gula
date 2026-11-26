// Service Worker for Gula Health Tracker
const isLocalhost = Boolean(
  typeof self !== "undefined" &&
    (self.location.hostname === "localhost" ||
      self.location.hostname === "127.0.0.1" ||
      self.location.hostname === "[::1]")
);

const CACHE_NAME = "gula-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/pdf.worker.min.mjs",
];

// In development / localhost, auto-uninstall and purge caches to prevent stale chunk errors
if (isLocalhost) {
  self.addEventListener("install", () => {
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });

  // Never intercept any requests on localhost
} else {
  // Production PWA behavior
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Don't intercept non-GET requests
    if (request.method !== "GET") return;

    // Network-first for _next/static to always get fresh chunks, fallback to cache
    if (request.url.includes("/_next/static/")) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => caches.match(request))
      );
      return;
    }

    // Cache-first for icons and static worker
    if (
      request.url.includes("/icons/") ||
      request.url.includes("/pdf.worker.min.mjs")
    ) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          });
        })
      );
      return;
    }

    // Network-first with cache fallback for page navigation
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback to cached root
            if (request.mode === "navigate") {
              return caches.match("/");
            }
            return new Response("Offline", { status: 503, statusText: "Offline" });
          });
        })
    );
  });
}
