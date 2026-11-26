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
      className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-[340px] w-full"
    >
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-normal-dot)] shrink-0" />,
          error:   <AlertCircle  className="w-3.5 h-3.5 text-[var(--status-abnormal-dot)] shrink-0" />,
          info:    <Info         className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />,
        };

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto px-3.5 py-2.5 rounded-xl",
              "bg-[var(--bg-card)] border border-[var(--border-strong)]",
              "shadow-[var(--shadow-lg)]",
              "flex items-center justify-between gap-3",
              "text-[12.5px] font-medium text-[var(--text-primary)] tracking-tight",
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
                  className="ml-1 text-[12px] font-semibold text-[var(--accent)] hover:underline cursor-pointer select-none"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
