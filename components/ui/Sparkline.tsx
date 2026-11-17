"use client";

import React from "react";
import { ResultFlag } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";

interface SparklineProps {
  values?: number[];
  flag?: ResultFlag;
  width?: number;
  height?: number;
  className?: string;
}

/** Tiny sparkline: ~64×24px, 1.5px stroke, NO fill, NO axes.
 *  Muted color (--text-muted) by default; status color only if abnormal/borderline.
 *  Small dot on the latest data point.
 *  Handles 1 and many data points gracefully.
 */
export function Sparkline({
  values = [],
  flag = "normal",
  width = 64,
  height = 24,
  className,
}: SparklineProps) {
  if (!values || values.length === 0) {
    return null;
  }

  // Color: muted for normal, status color otherwise
  const isAbnormal = flag !== "normal";
  const strokeVar =
    flag === "borderline"
      ? "var(--status-borderline-dot)"
      : flag === "normal"
      ? "var(--text-muted)"
      : "var(--status-abnormal-dot)"; // high / low / abnormal

  const dotVar = strokeVar;

  // Single point — dashed baseline with a centered dot
  if (values.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("overflow-visible shrink-0", className)}
        aria-hidden="true"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="var(--border-subtle)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle cx={width / 2} cy={height / 2} r="2" fill={dotVar} />
      </svg>
    );
  }

  const pad = 2;
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = values.map((val, idx) => {
    const x = pad + (idx / (values.length - 1)) * usableW;
    const y = pad + usableH - ((val - min) / range) * usableH;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ""
  );

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible shrink-0", className)}
      aria-hidden="true"
    >
      {/* No fill — line only */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeVar}
        strokeWidth={isAbnormal ? "1.5" : "1.25"}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isAbnormal ? 1 : 0.7}
      />
      {/* Dot on latest point */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2"
        fill={dotVar}
        opacity={isAbnormal ? 1 : 0.8}
      />
    </svg>
  );
}
