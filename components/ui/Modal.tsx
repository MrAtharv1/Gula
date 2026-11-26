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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
    sm:  "sm:max-w-sm",
    md:  "sm:max-w-md",
    lg:  "sm:max-w-lg",
    xl:  "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "w-full bg-[var(--bg-card)] border-t sm:border border-[var(--border-subtle)]",
          "rounded-t-2xl sm:rounded-xl max-h-[88vh] flex flex-col overflow-hidden",
          "shadow-[var(--shadow-xl)]",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-[0.97] duration-150 ease-out",
          maxWidths[maxWidth],
          className
        )}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 bg-[var(--border-strong)] rounded-full" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-5 pb-4 border-b border-[var(--border-subtle)]">
            <div>
              {title && (
                <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[12.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mt-0.5 -mr-0.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-[100ms] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
