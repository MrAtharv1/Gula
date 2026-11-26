"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development mode, unregister active service workers and purge caches
    // to prevent Turbopack HMR chunks from being served stale by Service Worker cache
    if (process.env.NODE_ENV === "development") {
      if (typeof navigator.serviceWorker.getRegistrations === "function") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    if (
      window.location.protocol === "http:" ||
      window.location.protocol === "https:"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Registered
        })
        .catch((err) => {
          console.debug("Service worker registration skipped:", err);
        });
    }
  }, []);

  return null;
}
