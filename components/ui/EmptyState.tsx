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
        "flex flex-col items-center justify-center p-10 sm:p-16 text-center",
        "rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-faint)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[var(--text-muted)] mt-1.5 mb-6 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex flex-col items-center justify-center gap-2.5">
        {actionLabel && onAction && (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          secondaryActionType === "link" ? (
            <button
              onClick={onSecondaryAction}
              className="text-[12.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2 cursor-pointer tap-target"
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
