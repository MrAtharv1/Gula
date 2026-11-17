import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/** ONE shared segmented-control used for every tab/filter group in the app.
 *  Active state: surface background + 1px border. No solid fill.
 *  Motion: 120ms ease-out. Respects prefers-reduced-motion via CSS.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "sm",
}: SegmentedControlProps<T>) {
  const isSm = size === "sm";
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-[10px]",
        "bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium rounded-lg select-none cursor-pointer",
              "transition-[background-color,border-color,color,box-shadow]",
              "duration-[120ms] ease-out",
              isSm ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm",
              isActive
                ? [
                    "bg-[var(--bg-card)] text-[var(--text-primary)]",
                    "border border-[var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
                    "font-semibold",
                  ]
                : [
                    "border border-transparent",
                    "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-card)]/50",
                  ]
            )}
          >
            {opt.icon && (
              <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                {opt.icon}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
