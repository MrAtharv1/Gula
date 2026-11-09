"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { ResultWithDate } from "@/lib/db/schema";
import { Badge } from "./ui/Badge";
import {
  calculateTrendInsight,
  calculateHistoricalMinMax,
} from "@/lib/utils/trends";
import { formatDate } from "@/lib/utils/date";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type TimeFilter = "3m" | "6m" | "1y" | "all";

interface BiomarkerTrendChartProps {
  history: ResultWithDate[];
  biomarkerName: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  refText?: string;
  description?: string;
  className?: string;
}

export function BiomarkerTrendChart({
  history,
  biomarkerName,
  unit,
  refLow,
  refHigh,
  refText,
  description,
  className,
}: BiomarkerTrendChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  // Chronological ascending order
  const chronologicalHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history].sort(
      (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );
  }, [history]);

  // Filter history by time range relative to latest test date
  const filteredHistory = useMemo(() => {
    if (chronologicalHistory.length === 0) return [];
    if (timeFilter === "all") return chronologicalHistory;

    const latestDate = new Date(
      chronologicalHistory[chronologicalHistory.length - 1].reportDate
    ).getTime();

    const daysMap: Record<TimeFilter, number> = {
      "3m": 90,
      "6m": 180,
      "1y": 365,
      all: Infinity,
    };

    const cutoff = latestDate - daysMap[timeFilter] * 24 * 3600 * 1000;
    const filtered = chronologicalHistory.filter(
      (item) => new Date(item.reportDate).getTime() >= cutoff
    );

    // If filtering leaves nothing, fall back to full history so chart never breaks
    return filtered.length > 0 ? filtered : chronologicalHistory;
  }, [chronologicalHistory, timeFilter]);

  // Chart data format
  const chartData = useMemo(() => {
    return filteredHistory.map((item) => ({
      date: item.reportDate,
      formattedDate: formatDate(item.reportDate),
      value: item.value,
      flag: item.flag,
      unit: item.unit || unit,
      refLow: item.refLow ?? refLow,
      refHigh: item.refHigh ?? refHigh,
    }));
  }, [filteredHistory, unit, refLow, refHigh]);

  const latest =
    chronologicalHistory.length > 0
      ? chronologicalHistory[chronologicalHistory.length - 1]
      : null;
  const previous =
    chronologicalHistory.length > 1
      ? chronologicalHistory[chronologicalHistory.length - 2]
      : null;
  const changeValue =
    latest && previous
      ? Number((latest.value - previous.value).toFixed(2))
      : null;

  // Min / Max calculation across full history
  const allValues = useMemo(
    () => chronologicalHistory.map((item) => item.value),
    [chronologicalHistory]
  );
  const minMax = useMemo(
    () => calculateHistoricalMinMax(allValues),
    [allValues]
  );

  // Pure deterministic trend insight (Rising / Falling across last N reports)
  const trendInsight = useMemo(
    () => calculateTrendInsight(allValues),
    [allValues]
  );

  // Compute Y-Axis Domain
  const yDomain = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    if (refLow !== undefined) vals.push(refLow);
    if (refHigh !== undefined) vals.push(refHigh);
    if (vals.length === 0) return [0, 100];

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const bottom = Math.max(0, Math.floor(min - span * 0.2));
    const top = Math.ceil(max + span * 0.2);
    return [bottom, top];
  }, [chartData, refLow, refHigh]);

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <p className="text-xs text-[var(--text-muted)]">
          No historical data recorded for this marker.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs space-y-5",
        className
      )}
    >
      {/* Header with Title and Time Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {biomarkerName}
            </h3>
            {latest && (
              <Badge variant={latest.flag} size="sm" showDot>
                {latest.flag}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {chronologicalHistory.length}{" "}
            {chronologicalHistory.length === 1 ? "report recorded" : "reports recorded"}
          </p>
        </div>

        {/* Time Filters: 3M, 6M, 1Y, All */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] self-start sm:self-auto">
          {(
            [
              { id: "3m", label: "3M" },
              { id: "6m", label: "6M" },
              { id: "1y", label: "1Y" },
              { id: "all", label: "All" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeFilter(id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all tap-target cursor-pointer",
                timeFilter === id
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Large Line Chart */}
      <div className="w-full h-64 sm:h-72 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />

            {/* Soft Shaded Normal Range Band */}
            {refLow !== undefined && refHigh !== undefined && (
              <ReferenceArea
                y1={refLow}
                y2={refHigh}
                fill="rgba(16, 185, 129, 0.08)"
                stroke="rgba(16, 185, 129, 0.25)"
                strokeDasharray="2 2"
              />
            )}

            {refLow !== undefined && refHigh === undefined && (
              <ReferenceLine
                y={refLow}
                stroke="rgba(16, 185, 129, 0.4)"
                strokeDasharray="3 3"
              />
            )}

            {refHigh !== undefined && refLow === undefined && (
              <ReferenceLine
                y={refHigh}
                stroke="rgba(16, 185, 129, 0.4)"
                strokeDasharray="3 3"
              />
            )}

            <XAxis
              dataKey="formattedDate"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              domain={yDomain}
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dx={-4}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-md text-xs min-w-[130px]">
                      <span className="font-semibold text-[var(--text-primary)] block mb-1">
                        {data.formattedDate}
                      </span>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {data.value}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {data.unit}
                        </span>
                      </div>
                      <Badge variant={data.flag} size="sm" showDot>
                        {data.flag}
                      </Badge>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Line
              type={chartData.length > 2 ? "monotone" : "linear"}
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{
                r: 4.5,
                fill: "var(--accent)",
                strokeWidth: 2,
                stroke: "var(--bg-card)",
              }}
              activeDot={{
                r: 6.5,
                fill: "var(--accent)",
                stroke: "var(--bg-primary)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Graceful Single Point Notice */}
      {chronologicalHistory.length === 1 && (
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] text-center">
          1 report recorded. Add more reports to see trend lines.
        </div>
      )}

      {/* Under-Chart Summary Row: Latest Value, Change vs Previous, Min/Max */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        {/* Latest Value */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Latest Value
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {latest?.value ?? "—"}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{unit}</span>
          </div>
        </div>

        {/* Change vs Previous */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            vs Previous
          </span>
          <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm font-medium">
            {changeValue !== null ? (
              <>
                {changeValue > 0 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : changeValue < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                )}
                <span className="text-[var(--text-primary)]">
                  {changeValue > 0 ? `+${changeValue}` : changeValue} {unit}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">Initial test</span>
            )}
          </div>
        </div>

        {/* Min / Max */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Min / Max
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-1 block">
            {minMax ? `${minMax.min} — ${minMax.max} ${unit}` : "—"}
          </span>
        </div>

        {/* Normal Reference Range */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Normal Range
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mt-1 block truncate">
            {refText ||
              (refLow !== undefined && refHigh !== undefined
                ? `${refLow} - ${refHigh} ${unit}`
                : refLow !== undefined
                ? `> ${refLow} ${unit}`
                : refHigh !== undefined
                ? `< ${refHigh} ${unit}`
                : "—")}
          </span>
        </div>
      </div>

      {/* Deterministic Trend Insight Banner (Zero AI) */}
      {trendInsight && (
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium",
            trendInsight.direction === "rising"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300"
          )}
        >
          {trendInsight.direction === "rising" ? (
            <TrendingUp className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <TrendingDown className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          )}
          <span>{trendInsight.message}</span>
        </div>
      )}

      {/* One-Line Plain-English Meaning (written once in dictionary, max 20 words) */}
      {description && (
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-subtle)] flex items-start gap-2 text-xs">
          <Info className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
