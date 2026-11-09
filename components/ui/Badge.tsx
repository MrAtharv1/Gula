import React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "normal"
  | "borderline"
  | "abnormal"
  | "low"
  | "high"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  showDot = true,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full border transition-colors select-none";

  const variants = {
    normal:
      "bg-[var(--status-normal-bg)] text-[var(--status-normal-text)] border-[var(--status-normal-border)]",
    borderline:
      "bg-[var(--status-borderline-bg)] text-[var(--status-borderline-text)] border-[var(--status-borderline-border)]",
    abnormal:
      "bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border-[var(--status-abnormal-border)]",
    low:
      "bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border-[var(--status-abnormal-border)]",
    high:
      "bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border-[var(--status-abnormal-border)]",
    neutral:
      "bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
  };

  const dotColors = {
    normal: "bg-emerald-500",
    borderline: "bg-amber-500",
    abnormal: "bg-rose-500",
    low: "bg-rose-500",
    high: "bg-rose-500",
    neutral: "bg-[var(--text-muted)]",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
