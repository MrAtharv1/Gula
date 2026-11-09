"use client";

import React from "react";
import { useToastStore } from "@/lib/store/toastStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
          info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
        };

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg",
              "flex items-center justify-between gap-3 text-xs font-medium text-[var(--text-primary)]",
              "animate-in fade-in slide-in-from-bottom-2 duration-150"
            )}
          >
            <div className="flex items-center gap-2.5">
              {icons[t.type || "info"]}
              <span>{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="ml-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer select-none"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors tap-target cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
