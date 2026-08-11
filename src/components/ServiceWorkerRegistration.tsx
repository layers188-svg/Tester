"use client";

import { useEffect } from "react";

/** Registers the static-asset-only service worker (see public/sw.js) for PWA installability. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a progressive enhancement — never block the app on it.
      });
    }
  }, []);
  return null;
}
