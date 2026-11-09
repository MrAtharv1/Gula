import React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionType?: "button" | "link";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionType = "button",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] mt-1 mb-5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex flex-col items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          secondaryActionType === "link" ? (
            <button
              onClick={onSecondaryAction}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline cursor-pointer tap-target"
            >
              {secondaryActionLabel}
            </button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
