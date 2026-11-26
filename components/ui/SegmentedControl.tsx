import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

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
        "inline-flex items-center gap-0.5 p-0.5 rounded-[9px]",
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
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] select-none tracking-tight",
              "transition-all duration-[100ms] ease-out",
              opt.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              isSm ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13px]",
              isActive
                ? [
                    "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold",
                    "shadow-[var(--shadow-sm)]",
                  ]
                : [
                    "text-[var(--text-muted)] font-medium",
                    !opt.disabled && "hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                  ]
            )}
          >
            {opt.icon && (
              <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center opacity-80">
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
