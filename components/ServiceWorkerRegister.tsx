"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isCapacitorNative = Boolean(
      (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );

    // Disable Service Worker in development (avoids stale Turbopack chunks)
    // and inside Capacitor Android WebView (already bundled locally)
    if (process.env.NODE_ENV === "development" || isCapacitorNative) {
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
