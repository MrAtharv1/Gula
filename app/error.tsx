"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-secondary)]">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Something went wrong
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Gula encountered an unexpected error. Your saved health reports and data remain safe on this device.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => reset()}
          >
            Refresh app
          </Button>
        </div>
      </div>
    </div>
  );
}
