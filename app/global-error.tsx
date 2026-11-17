"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-[#FAFAFA] dark:bg-[#0A0A0B] text-[#0B0B0C] dark:text-[#EDEDEF] font-sans">
        <div className="max-w-md w-full p-8 rounded-xl bg-white dark:bg-[#111113] border border-black/10 dark:border-white/10 text-center space-y-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">
            Unexpected application error
          </h2>
          <p className="text-[13px] text-[#6B6F76] dark:text-[#8A8F98] leading-relaxed">
            Gula encountered a critical error. Please reload the page to restore your local dashboard.
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-[#0B0B0C] hover:bg-[#202024] dark:bg-[#EDEDEF] dark:hover:bg-white text-white dark:text-[#0B0B0C] text-[13px] font-medium cursor-pointer transition-colors"
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
