"use client";

import React, { useEffect, useState } from "react";

/**
 * Pink-themed initial launch screen showing the Gula logo for ~1 second
 * whenever the web app or Android APK opens.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    // Hide native Capacitor splash screen once React has painted the branded launch view
    import("@capacitor/splash-screen")
      .then(({ SplashScreen: CapSplash }) => CapSplash.hide({ fadeOutDuration: 150 }))
      .catch(() => {
        // Not running in Capacitor native shell
      });

    const fadeTimer = setTimeout(() => setPhase("fading"), 950);
    const hideTimer = setTimeout(() => setPhase("hidden"), 1300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      role="status"
      aria-label="Loading Gula"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 select-none transition-all duration-300 ease-out ${
        phase === "fading" ? "opacity-0 scale-[1.015] pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 228, 239, 0.98) 45%, rgba(255, 209, 228, 1) 100%)",
      }}
    >
      {/* Dark mode pink-plum backdrop overlay */}
      <div
        aria-hidden="true"
        className="hidden dark:block absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(74, 21, 48, 0.92) 0%, rgba(36, 12, 25, 0.98) 52%, rgba(18, 7, 13, 1) 100%)",
        }}
      />

      {/* Soft pink halo behind logo */}
      <div
        aria-hidden="true"
        className="relative flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-full blur-2xl opacity-55 dark:opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(244, 63, 146, 0.34) 0%, rgba(236, 72, 153, 0.08) 65%, transparent 100%)",
          }}
        />

        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[30px] bg-white/85 dark:bg-[#2a1220]/90 backdrop-blur-xl border border-pink-200/80 dark:border-pink-400/20 shadow-[0_18px_48px_-12px_rgba(236,72,153,0.28)] flex items-center justify-center p-3">
          <img
            src="/logo.png"
            alt="Gula"
            className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(236,72,153,0.2)]"
          />
        </div>

        <div className="relative mt-5 text-center space-y-1">
          <p
            className="text-[20px] font-semibold tracking-[0.08em] text-[#831843] dark:text-pink-100 leading-none"
            style={{ fontFamily: "var(--font-karla), var(--font-geist-sans), sans-serif" }}
          >
            GULA
          </p>
          <p
            className="text-[12.5px] font-medium tracking-[0.03em] text-[#9d174d]/80 dark:text-pink-200/80"
            style={{ fontFamily: "var(--font-karla), var(--font-geist-sans), sans-serif" }}
          >
            Your Privacy Matters
          </p>
        </div>

        {/* Minimal pink shimmer progress bar */}
        <div className="relative mt-6 w-32 h-1 rounded-full bg-pink-200/80 dark:bg-pink-950/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f43f8e] via-[#ec4899] to-[#fb7185] transition-all duration-900 ease-out"
            style={{ width: phase === "fading" ? "100%" : "82%" }}
          />
        </div>
      </div>
    </div>
  );
}
