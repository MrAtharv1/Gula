import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Skeleton({
  className,
  rounded = "xl",
  ...props
}: SkeletonProps) {
  const roundings = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-[var(--bg-card-subtle)]",
        roundings[rounded],
        className
      )}
      {...props}
    />
  );
}
