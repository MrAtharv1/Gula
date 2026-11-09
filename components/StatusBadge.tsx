import React from "react";
import { Badge, BadgeVariant } from "./ui/Badge";

interface StatusBadgeProps {
  status?: string;
  flag?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, flag, className, size = "md" }: StatusBadgeProps) {
  const variant: BadgeVariant =
    flag === "high" || flag === "low"
      ? (flag as BadgeVariant)
      : status === "abnormal"
      ? "abnormal"
      : status === "borderline" || flag === "borderline"
      ? "borderline"
      : "normal";

  const label =
    flag === "high"
      ? "High"
      : flag === "low"
      ? "Low"
      : status === "borderline" || flag === "borderline"
      ? "Borderline"
      : status === "abnormal"
      ? "Abnormal"
      : "Normal";

  return (
    <Badge variant={variant} size={size} className={className}>
      {label}
    </Badge>
  );
}
