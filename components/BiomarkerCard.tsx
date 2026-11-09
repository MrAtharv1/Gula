"use client";

import React from "react";
import { LatestResultSummary } from "@/lib/db/schema";
import { Badge } from "./ui/Badge";
import { Sparkline } from "./ui/Sparkline";
import { RangeBar } from "./ui/RangeBar";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface BiomarkerCardProps {
  summary: LatestResultSummary;
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
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
    category,
    sparklineValues = [],
  } = summary;

  // Format change arrow and text
  const renderChange = () => {
    if (!previousResult || changeValue === undefined) {
      return (
        <span className="text-[11px] text-[var(--text-muted)]">
          First record
        </span>
      );
    }

    if (changeValue > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
          <ArrowUp className="w-3 h-3 text-rose-500 shrink-0" />
          <span>up {Math.abs(changeValue)}</span>
        </span>
      );
    }

    if (changeValue < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
          <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
          <span>down {Math.abs(changeValue)}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
        <Minus className="w-3 h-3 shrink-0" />
        <span>no change</span>
      </span>
    );
  };

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
      className={cn(
        "group relative p-4 rounded-2xl bg-[var(--bg-card)] border transition-all duration-150 cursor-pointer text-left select-none tap-target flex flex-col justify-between space-y-3",
        isSelected
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-xs"
          : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:shadow-xs",
        className
      )}
      aria-label={`${displayName}, ${latestResult.value} ${latestResult.unit}, ${statusLabel}`}
    >
      {/* Header: Name and Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
            {displayName}
          </h4>
        </div>
        <Badge variant={latestResult.flag} size="sm" showDot>
          {statusLabel}
        </Badge>
      </div>

      {/* Main Metric Value and Sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {latestResult.value}
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {latestResult.unit}
          </span>
        </div>

        {/* Tiny Sparkline */}
        <div className="pb-1">
          <Sparkline
            values={sparklineValues.length > 0 ? sparklineValues : [latestResult.value]}
            flag={latestResult.flag}
            width={64}
            height={22}
          />
        </div>
      </div>

      {/* Change Indicator vs Previous Report */}
      <div className="flex items-center justify-between text-xs">
        {renderChange()}
        {previousResult && (
          <span className="text-[10px] text-[var(--text-muted)]">
            vs prev
          </span>
        )}
      </div>

      {/* Slim Reference Range Bar */}
      <div className="pt-1">
        <RangeBar
          value={latestResult.value}
          refLow={latestResult.refLow}
          refHigh={latestResult.refHigh}
          flag={latestResult.flag}
          unit={latestResult.unit}
          showLabels
        />
      </div>
    </div>
  );
}
