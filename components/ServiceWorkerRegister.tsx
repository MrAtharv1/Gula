"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol === "http:" ||
      window.location.protocol === "https:"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Registered
        })
        .catch((err) => {
          console.debug("Service worker registration skipped:", err);
        });
    }
  }, []);

  return null;
}
