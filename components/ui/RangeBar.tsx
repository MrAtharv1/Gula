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

/** Slim 4px range bar.
 *  - Normal range: soft tinted segment.
 *  - Marker: 8px dot clamped inside the track, colored by status.
 *  - Labels: 11px muted sans-serif tabular-nums. No "NORMAL" label.
 *  - One-sided ranges: "Under 149" / "Over 40" — no invented lower bound.
 */
export function RangeBar({
  value,
  refLow,
  refHigh,
  flag = "normal",
  unit = "",
  className,
  showLabels = true,
}: RangeBarProps) {
  // No reference bounds at all — show a simple dashed track
  if (refLow === undefined && refHigh === undefined) {
    return (
      <div className={cn("w-full space-y-1", className)}>
        <div className="w-full h-1 rounded-full bg-[var(--border-subtle)]" />
        {showLabels && (
          <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
            <span>No reference range</span>
          </div>
        )}
      </div>
    );
  }

  // ── Compute layout ────────────────────────────────────────
  let normalStartPct = 25;
  let normalEndPct = 75;
  let markerPct = 50;
  let leftLabel = "";
  let rightLabel = "";

  if (refLow !== undefined && refHigh !== undefined) {
    // Both bounds
    const span = Math.max(refHigh - refLow, 0.001);
    const margin = span * 0.35;
    const viewMin = refLow - margin;
    const viewMax = refHigh + margin;
    const totalViewSpan = viewMax - viewMin;

    normalStartPct = ((refLow - viewMin) / totalViewSpan) * 100;
    normalEndPct = ((refHigh - viewMin) / totalViewSpan) * 100;

    const rawPos = ((value - viewMin) / totalViewSpan) * 100;
    markerPct = Math.max(2, Math.min(98, rawPos));

    leftLabel = String(refLow);
    rightLabel = String(refHigh);
  } else if (refHigh !== undefined && refLow === undefined) {
    // Upper bound only — "Under N"
    normalStartPct = 0;
    normalEndPct = 72;
    const maxView = refHigh * 1.35;
    const rawPos = (value / Math.max(maxView, 0.001)) * 100;
    markerPct = Math.max(2, Math.min(98, rawPos));

    leftLabel = "";
    rightLabel = `Under ${refHigh}${unit ? ` ${unit}` : ""}`;
  } else if (refLow !== undefined && refHigh === undefined) {
    // Lower bound only — "Over N"
    normalStartPct = 28;
    normalEndPct = 100;
    // view: from ~50% of refLow to 160%
    const minView = Math.max(0, refLow * 0.5);
    const maxView = refLow * 1.6;
    const totalViewSpan = Math.max(maxView - minView, 0.001);
    const rawPos = ((value - minView) / totalViewSpan) * 100;
    markerPct = Math.max(2, Math.min(98, rawPos));

    leftLabel = `Over ${refLow}${unit ? ` ${unit}` : ""}`;
    rightLabel = "";
  }

  // ── Dot color ─────────────────────────────────────────────
  const dotStyle =
    flag === "normal"
      ? "bg-[var(--status-normal-dot)]"
      : flag === "borderline"
      ? "bg-[var(--status-borderline-dot)]"
      : "bg-[var(--status-abnormal-dot)]";

  const bandStyle =
    flag === "normal"
      ? "bg-[var(--status-normal-bg)]"
      : flag === "borderline"
      ? "bg-[var(--status-borderline-bg)]"
      : "bg-[var(--status-normal-bg)]"; // band is always normal-tinted

  return (
    <div className={cn("w-full", className)}>
      {/* Track — 3px height, premium thin */}
      <div className="relative w-full h-[3px] rounded-full bg-[var(--bg-card-subtle)]">
        {/* Normal range tinted band */}
        <div
          className={cn("absolute top-0 bottom-0 rounded-full", bandStyle)}
          style={{
            left: `${normalStartPct}%`,
            width: `${Math.max(1, normalEndPct - normalStartPct)}%`,
          }}
        />
        {/* 7px dot marker */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-[7px] h-[7px] rounded-full",
            "ring-[1.5px] ring-[var(--bg-card)]",
            "transition-[left] duration-[150ms] ease-out",
            dotStyle
          )}
          style={{ left: `${markerPct}%` }}
          aria-label={`Value ${value}${unit ? ` ${unit}` : ""}`}
        />
      </div>

      {/* Labels — 10.5px faint tabular-nums */}
      {showLabels && (refLow !== undefined || refHigh !== undefined) && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10.5px] text-[var(--text-faint)] tabular-nums font-normal">
            {leftLabel}
          </span>
          <span className="text-[10.5px] text-[var(--text-faint)] tabular-nums font-normal">
            {rightLabel}
          </span>
        </div>
      )}
    </div>
  );
}
