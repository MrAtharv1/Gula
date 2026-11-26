import React from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = [
      "inline-flex items-center justify-center font-medium rounded-lg",
      "transition-all duration-[100ms] ease-out",
      "select-none cursor-pointer",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
      "active:scale-[0.97]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    ].join(" ");

    const variants = {
      primary:
        "bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] text-[var(--btn-primary-text)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
      secondary:
        "bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] shadow-[var(--shadow-sm)]",
      ghost:
        "bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      danger:
        "bg-transparent hover:bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border border-transparent hover:border-[var(--status-abnormal-border)]",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-[12.5px] gap-1.5",
      md: "h-8 px-3 text-[13px] gap-2",
      lg: "h-9 px-4 text-[13.5px] gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
