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
import { SegmentedControl } from "./ui/SegmentedControl";
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

  // Chart data format with numeric timestamps for true time-scaling
  const chartData = useMemo(() => {
    return filteredHistory.map((item) => ({
      timestamp: new Date(item.reportDate).getTime(),
      date: item.reportDate,
      formattedDate: formatDate(item.reportDate),
      value: item.value,
      flag: item.flag,
      unit: item.unit || unit,
      refLow: item.refLow ?? refLow,
      refHigh: item.refHigh ?? refHigh,
    }));
  }, [filteredHistory, unit, refLow, refHigh]);

  const { xDomain, xTicks } = useMemo(() => {
    if (chartData.length === 0) return { xDomain: [0, 1], xTicks: [] };
    const ts = chartData.map((d) => d.timestamp);
    const min = Math.min(...ts);
    const max = Math.max(...ts);
    const ticks = Array.from(new Set(ts)).sort((a, b) => a - b);
    if (min === max) {
      return {
        xDomain: [min - 30 * 86400000, max + 30 * 86400000],
        xTicks: ticks,
      };
    }
    const span = max - min;
    const pad = Math.max(span * 0.08, 86400000 * 2);
    return {
      xDomain: [min - pad, max + pad],
      xTicks: ticks,
    };
  }, [chartData]);

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

  // Compute Y-Axis Domain with auto padding, not forcing from 0
  const yDomain = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    if (refLow !== undefined) vals.push(refLow);
    if (refHigh !== undefined) vals.push(refHigh);
    if (vals.length === 0) return ["auto", "auto"];

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const bottom = Math.floor(min - span * 0.15);
    const top = Math.ceil(max + span * 0.15);
    return [bottom, top];
  }, [chartData, refLow, refHigh]);

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <p className="text-[13px] text-[var(--text-muted)]">
          No historical data recorded for this marker.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-5",
        className
      )}
    >
      {/* Header with Title and Time Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            {biomarkerName}
          </h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            {chronologicalHistory.length}{" "}
            {chronologicalHistory.length === 1 ? "report recorded" : "reports recorded"}
          </p>
        </div>

        {/* Time Filters: 3M, 6M, 1Y, All */}
        <SegmentedControl
          options={[
            { value: "3m" as TimeFilter, label: "3M" },
            { value: "6m" as TimeFilter, label: "6M" },
            { value: "1y" as TimeFilter, label: "1Y" },
            { value: "all" as TimeFilter, label: "All" },
          ]}
          value={timeFilter}
          onChange={setTimeFilter}
          className="self-start sm:self-auto"
        />
      </div>

      {/* Recharts Large Line Chart */}
      <div className="w-full h-64 sm:h-72 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              strokeOpacity={0.6}
              vertical={false}
            />

            {/* Soft Shaded Normal Range Band */}
            {refLow !== undefined && refHigh !== undefined && (
              <ReferenceArea
                y1={refLow}
                y2={refHigh}
                fill="var(--status-normal-bg)"
                stroke="var(--status-normal-dot)"
                strokeDasharray="2 2"
                strokeOpacity={0.3}
              />
            )}

            {refLow !== undefined && refHigh === undefined && (
              <ReferenceLine
                y={refLow}
                stroke="var(--status-normal-dot)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}

            {refHigh !== undefined && refLow === undefined && (
              <ReferenceLine
                y={refHigh}
                stroke="var(--status-normal-dot)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}

            {/* Min & Max Historical Markers */}
            {minMax && chartData.length > 1 && (
              <>
                <ReferenceLine
                  y={minMax.min}
                  stroke="var(--text-muted)"
                  strokeDasharray="2 3"
                  strokeOpacity={0.4}
                  label={{
                    value: `Min ${minMax.min}`,
                    position: "insideBottomLeft",
                    fill: "var(--text-muted)",
                    fontSize: 10,
                  }}
                />
                {minMax.max !== minMax.min && (
                  <ReferenceLine
                    y={minMax.max}
                    stroke="var(--text-muted)"
                    strokeDasharray="2 3"
                    strokeOpacity={0.4}
                    label={{
                      value: `Max ${minMax.max}`,
                      position: "insideTopLeft",
                      fill: "var(--text-muted)",
                      fontSize: 10,
                    }}
                  />
                )}
              </>
            )}

            {/* Proportional Time-Scaled X-Axis */}
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={(ts) => formatDate(new Date(ts).toISOString().split("T")[0])}
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
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-xs min-w-[130px]">
                      <span className="font-semibold text-[var(--text-primary)] block mb-1">
                        {data.formattedDate}
                      </span>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {data.value}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {data.unit}
                        </span>
                      </div>
                      {data.flag !== "normal" && (
                        <Badge variant={data.flag} size="sm" showDot>
                          {data.flag === "high" ? "High" : data.flag === "low" ? "Low" : "Borderline"}
                        </Badge>
                      )}
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
              strokeWidth={2}
              dot={{
                r: 4,
                fill: "var(--accent)",
                strokeWidth: 2,
                stroke: "var(--bg-card)",
              }}
              activeDot={{
                r: 6,
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
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-muted)] text-center">
          1 report recorded. Add more reports to see trend lines.
        </div>
      )}

      {/* Under-Chart Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Latest value
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[20px] font-semibold leading-none tracking-tight text-[var(--text-primary)] tabular-nums">
              {latest?.value ?? "—"}
            </span>
            <span className="text-[12px] text-[var(--text-muted)]">{unit}</span>
          </div>
        </div>

        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Vs previous
          </span>
          <div className="flex items-center gap-1 mt-1 text-[13px] font-medium">
            {changeValue !== null ? (
              <>
                {changeValue > 0 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                ) : changeValue < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                )}
                <span className="text-[var(--text-primary)] tabular-nums">
                  {changeValue > 0 ? `+${changeValue}` : changeValue} {unit}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">Initial test</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Min / Max
          </span>
          <span className="text-[13px] font-medium text-[var(--text-primary)] mt-1 block tabular-nums">
            {minMax ? `${minMax.min} — ${minMax.max} ${unit}` : "—"}
          </span>
        </div>

        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Normal range
          </span>
          <span className="text-[13px] font-medium text-[var(--text-secondary)] mt-1 block truncate tabular-nums">
            {refText ||
              (refLow !== undefined && refHigh !== undefined
                ? `${refLow} — ${refHigh} ${unit}`
                : refLow !== undefined
                ? `> ${refLow} ${unit}`
                : refHigh !== undefined
                ? `< ${refHigh} ${unit}`
                : "—")}
          </span>
        </div>
      </div>

      {/* Deterministic Trend Insight Banner */}
      {trendInsight && (
        <div
          className={cn(
            "p-3 rounded-lg border flex items-center gap-2.5 text-[12px] font-medium",
            trendInsight.direction === "rising"
              ? "bg-[var(--status-borderline-bg)] border-[var(--status-borderline-border)] text-[var(--status-borderline-text)]"
              : "bg-[var(--status-normal-bg)] border-[var(--status-normal-border)] text-[var(--status-normal-text)]"
          )}
        >
          {trendInsight.direction === "rising" ? (
            <TrendingUp className="w-4 h-4 shrink-0" />
          ) : (
            <TrendingDown className="w-4 h-4 shrink-0" />
          )}
          <span>{trendInsight.message}</span>
        </div>
      )}

      {/* Meaning description */}
      {description && (
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-start gap-2 text-[12px]">
          <Info className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
