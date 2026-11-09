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

export function Sparkline({
  values = [],
  flag = "normal",
  width = 72,
  height = 24,
  className,
}: SparklineProps) {
  if (!values || values.length === 0) {
    return null;
  }

  // Color mapping based on flag
  const strokeColor =
    flag === "normal"
      ? "stroke-emerald-500"
      : flag === "borderline"
      ? "stroke-amber-500"
      : "stroke-rose-500";

  const fillColor =
    flag === "normal"
      ? "fill-emerald-500/15"
      : flag === "borderline"
      ? "fill-amber-500/15"
      : "fill-rose-500/15";

  const dotColor =
    flag === "normal"
      ? "fill-emerald-500"
      : flag === "borderline"
      ? "fill-amber-500"
      : "fill-rose-500";

  // If only 1 data point, show a single crisp dot
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
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 2"
          className="text-[var(--border-subtle)]"
        />
        <circle cx={width / 2} cy={height / 2} r="2.5" className={dotColor} />
      </svg>
    );
  }

  const padding = 3;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1)) * usableWidth;
    const y = padding + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ""
  );

  const lastPoint = points[points.length - 1];

  // Closed area for subtle gradient under sparkline
  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible shrink-0", className)}
      aria-hidden="true"
    >
      <path d={areaD} className={fillColor} />
      <path
        d={pathD}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeColor}
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2"
        className={dotColor}
      />
    </svg>
  );
}
