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
      <body className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Unexpected application error
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Gula encountered a critical error. Please reload the page to restore your local dashboard.
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
