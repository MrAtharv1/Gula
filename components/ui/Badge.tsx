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
    "inline-flex items-center font-medium rounded-full border select-none tracking-tight";

  const variants: Record<BadgeVariant, string> = {
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
      "bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]",
  };

  const dotColors: Record<BadgeVariant, string> = {
    normal:    "bg-[var(--status-normal-dot)]",
    borderline:"bg-[var(--status-borderline-dot)]",
    abnormal:  "bg-[var(--status-abnormal-dot)]",
    low:       "bg-[var(--status-abnormal-dot)]",
    high:      "bg-[var(--status-abnormal-dot)]",
    neutral:   "bg-[var(--text-faint)]",
  };

  const sizes = {
    sm: "text-[10.5px] px-1.5 py-[2px] gap-[3px]",
    md: "text-[11.5px] px-2 py-[3px] gap-1",
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
