"use client";

import React from "react";
import { LatestResultSummary } from "@/lib/db/schema";
import { Badge } from "./ui/Badge";
import { Sparkline } from "./ui/Sparkline";
import { RangeBar } from "./ui/RangeBar";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

interface BiomarkerCardProps {
  summary: LatestResultSummary;
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
}

const SHORT_NAME_MAP: Record<string, string> = {
  "White Blood Cell Count": "WBC",
  "Red Blood Cell Count": "RBC",
  "Platelet Count": "Platelets",
  "Total Cholesterol": "Total Chol",
  "LDL Cholesterol": "LDL",
  "HDL Cholesterol": "HDL",
  "VLDL Cholesterol": "VLDL",
  "Non-HDL Cholesterol": "Non-HDL",
  "Fasting Blood Glucose": "Fasting Glucose",
  "Random Blood Glucose": "Random Glucose",
  "Total Cholesterol / HDL Ratio": "TC / HDL",
};

/** Short display names — abbreviations where the metric dict has long names.
 *  Full name shown in tooltip and on the detail page.
 */
export function getShortName(displayName: string): string {
  if (SHORT_NAME_MAP[displayName]) return SHORT_NAME_MAP[displayName];
  // Strip parenthetical suffixes like "(ALT)" or "(MCV)" since we show the abbreviation
  // Pattern: "Long Name (SHORT)" → "SHORT"
  const match = displayName.match(/\(([^)]{2,8})\)$/);
  if (match) return match[1];
  // Already short (≤12 chars) or no parens
  return displayName;
}

export function BiomarkerCard({
  summary,
  isSelected,
  onClick,
  className,
}: BiomarkerCardProps) {
  const {
    latestResult,
    previousResult,
    changeValue,
    displayName,
    sparklineValues = [],
  } = summary;

  const shortName = getShortName(displayName);
  const isAbnormal = latestResult.flag !== "normal";

  // Delta row — neutral muted text, never colored red/green based on direction; colored only if out of range
  const renderDelta = () => {
    if (!previousResult || changeValue === undefined) {
      return (
        <span className="text-[12px] text-[var(--text-muted)]">
          First record
        </span>
      );
    }

    if (changeValue === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
          <Minus className="w-3 h-3 shrink-0" />
          <span>No change</span>
        </span>
      );
    }

    const absChange = Math.abs(changeValue);
    const direction = changeValue > 0 ? "up" : "down";
    const ArrowIcon = changeValue > 0 ? ArrowUp : ArrowDown;

    // Date from previous result if available
    const prevDate = previousResult.reportDate
      ? formatDate(previousResult.reportDate)
      : "last report";

    const deltaColorClass = isAbnormal
      ? latestResult.flag === "borderline"
        ? "text-[var(--status-borderline-text)]"
        : "text-[var(--status-abnormal-text)]"
      : "text-[var(--text-muted)]";

    return (
      <span className={cn("inline-flex items-center gap-1 text-[12px] tabular-nums", deltaColorClass)}>
        <ArrowIcon className={cn("w-3 h-3 shrink-0", deltaColorClass)} />
        <span>
          {direction} {absChange} since {prevDate}
        </span>
      </span>
    );
  };

  // Status label — sentence case
  const statusLabel =
    latestResult.flag === "high"
      ? "High"
      : latestResult.flag === "low"
      ? "Low"
      : latestResult.flag === "borderline"
      ? "Borderline"
      : "Normal";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      title={displayName}
      className={cn(
        "group relative p-3.5 rounded-xl bg-[var(--bg-card)] border cursor-pointer text-left select-none",
        "h-full flex flex-col justify-between gap-2.5",
        "transition-[border-color] duration-[120ms] ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        isSelected
          ? "border-[var(--accent)]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-hover)]",
        className
      )}
      aria-label={`${displayName}, ${latestResult.value} ${latestResult.unit}, ${statusLabel}`}
    >
      {/* Row 1: Short name + status badge (only if abnormal or borderline) */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--text-primary)] leading-tight">
          {shortName}
        </span>
        {isAbnormal && (
          <Badge variant={latestResult.flag} size="sm" showDot>
            {statusLabel}
          </Badge>
        )}
      </div>

      {/* Row 2: Value + unit + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1 tabular-nums">
          <span className="text-[24px] font-semibold leading-none tracking-[-0.01em] text-[var(--text-primary)] tabular-nums">
            {latestResult.value}
          </span>
          <span className="text-[12px] text-[var(--text-muted)] font-normal ml-0.5">
            {latestResult.unit}
          </span>
        </div>

        <Sparkline
          values={sparklineValues.length > 0 ? sparklineValues : [latestResult.value]}
          flag={latestResult.flag}
          width={60}
          height={20}
        />
      </div>

      {/* Row 3: Delta — neutral muted text */}
      <div className="flex items-center">
        {renderDelta()}
      </div>

      {/* Row 4: 4px range bar */}
      <RangeBar
        value={latestResult.value}
        refLow={latestResult.refLow}
        refHigh={latestResult.refHigh}
        flag={latestResult.flag}
        unit={latestResult.unit}
        showLabels
      />
    </div>
  );
}
