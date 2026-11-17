import React from "react";
import { cn } from "@/lib/utils/cn";

/** Shared page container: max-width 1200px, centered, 24px side padding (16px on mobile).
 *  Used for every route so titles and content share the same left edge.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[1200px] mx-auto",
        "px-4 sm:px-6",   /* 16px mobile → 24px desktop */
        className
      )}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Shared page header: title on left, actions on right.
 *  Sits inside PageContainer so title and content share the same left edge.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-5", className)}>
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)] leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {actions}
        </div>
      )}
    </div>
  );
}
