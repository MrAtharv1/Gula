"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = "lg",
}: ModalProps) {
  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet on mobile (slides up), Centered dialog on desktop */}
      <div
        className={cn(
          "w-full bg-[var(--bg-surface)] border-t sm:border border-[var(--border-subtle)] shadow-lg",
          "rounded-t-2xl sm:rounded-xl max-h-[88vh] flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 ease-out",
          maxWidths[maxWidth],
          className
        )}
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full" />
        </div>

        {/* Modal Header */}
        {(title || description) && (
          <div className="flex items-center justify-between p-4 sm:p-5 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
            <div>
              {title && (
                <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)] transition-colors tap-target cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
