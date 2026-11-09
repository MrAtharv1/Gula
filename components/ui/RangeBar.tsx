"use client";

import React from "react";
import { ResultFlag } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";

interface RangeBarProps {
  value: number;
  refLow?: number;
  refHigh?: number;
  flag?: ResultFlag;
  unit?: string;
  className?: string;
  showLabels?: boolean;
}

export function RangeBar({
  value,
  refLow,
  refHigh,
  flag = "normal",
  unit = "",
  className,
  showLabels = true,
}: RangeBarProps) {
  // If no reference bounds exist, return simple dashed indicator
  if (refLow === undefined && refHigh === undefined) {
    return (
      <div className={cn("w-full space-y-1", className)}>
        <div className="w-full h-1.5 rounded-full bg-[var(--border-subtle)]" />
        {showLabels && (
          <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>No reference range</span>
          </div>
        )}
      </div>
    );
  }

  // Calculate boundaries and marker position
  let normalStartPct = 25;
  let normalEndPct = 75;
  let markerPct = 50;

  if (refLow !== undefined && refHigh !== undefined) {
    const span = Math.max(refHigh - refLow, 0.001);
    // Add 30% margin on both sides so out-of-range readings can be visualized
    const margin = span * 0.35;
    const viewMin = refLow - margin;
    const viewMax = refHigh + margin;
    const totalViewSpan = viewMax - viewMin;

    normalStartPct = ((refLow - viewMin) / totalViewSpan) * 100;
    normalEndPct = ((refHigh - viewMin) / totalViewSpan) * 100;

    const rawPos = ((value - viewMin) / totalViewSpan) * 100;
    markerPct = Math.max(3, Math.min(97, rawPos));
  } else if (refHigh !== undefined && refLow === undefined) {
    // Upper bound only (e.g. < 200)
    normalStartPct = 0;
    normalEndPct = 75;
    const maxView = refHigh * 1.35;
    const rawPos = (value / Math.max(maxView, 0.001)) * 100;
    markerPct = Math.max(3, Math.min(97, rawPos));
  } else if (refLow !== undefined && refHigh === undefined) {
    // Lower bound only (e.g. > 40)
    normalStartPct = 25;
    normalEndPct = 100;
    const minView = Math.max(0, refLow * 0.5);
    const maxView = refLow * 1.6;
    const totalViewSpan = maxView - minView;
    const rawPos = ((value - minView) / Math.max(totalViewSpan, 0.001)) * 100;
    markerPct = Math.max(3, Math.min(97, rawPos));
  }

  const pinColor =
    flag === "normal"
      ? "bg-emerald-500 shadow-emerald-500/40"
      : flag === "borderline"
      ? "bg-amber-500 shadow-amber-500/40"
      : "bg-rose-500 shadow-rose-500/40";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {/* The Range Bar Track */}
      <div className="relative w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-visible">
        {/* Normal Zone Highlight */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/25 dark:bg-emerald-500/20 rounded-full"
          style={{
            left: `${normalStartPct}%`,
            width: `${Math.max(2, normalEndPct - normalStartPct)}%`,
          }}
        />

        {/* Current Value Marker Pin */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card)] shadow-xs transition-all duration-300",
            pinColor
          )}
          style={{ left: `${markerPct}%` }}
          aria-label={`Value ${value} ${unit} at ${Math.round(markerPct)}% of range`}
        />
      </div>

      {/* Range Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
          <span>
            {refLow !== undefined ? `${refLow}` : "0"}
          </span>
          <span className="text-[9px] uppercase font-sans tracking-wider text-[var(--text-muted)]/70">
            Normal
          </span>
          <span>
            {refHigh !== undefined ? `${refHigh}` : "—"}
          </span>
        </div>
      )}
    </div>
  );
}
