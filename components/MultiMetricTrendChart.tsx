"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { LatestResultSummary, ResultWithDate } from "@/lib/db/schema";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { formatDate } from "@/lib/utils/date";
import { SegmentedControl } from "./ui/SegmentedControl";
import { getShortName } from "./BiomarkerCard";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const OVERLAY_COLORS = [
  "#5B5BD6", // Indigo accent
  "#2F9E6B", // Soft green
  "#D9922B", // Amber
  "#D6455D", // Red
];

interface MultiMetricTrendChartProps {
  summaries: LatestResultSummary[];
  allHistory: Record<string, ResultWithDate[]>;
  initialSelectedKeys?: string[];
  className?: string;
}

export function MultiMetricTrendChart({
  summaries,
  allHistory,
  initialSelectedKeys,
  className,
}: MultiMetricTrendChartProps) {
  // Up to 4 metrics selected
  const defaultKeys = useMemo(() => {
    if (initialSelectedKeys && initialSelectedKeys.length > 0) {
      return initialSelectedKeys.slice(0, 4);
    }
    const lipidKeys = ["cholesterol_total", "ldl", "hdl", "triglycerides"];
    const foundLipids = lipidKeys.filter((k) => summaries.some((s) => s.metricKey === k));
    if (foundLipids.length >= 2) return foundLipids.slice(0, 4);
    return summaries.slice(0, Math.min(3, summaries.length)).map((s) => s.metricKey);
  }, [summaries, initialSelectedKeys]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultKeys);
  const [scaleMode, setScaleMode] = useState<"relative" | "actual">("relative");
  const [timeFilter, setTimeFilter] = useState<"3m" | "6m" | "1y" | "all">("all");

  const getSummary = (key: string) => summaries.find((s) => s.metricKey === key);

  // Check if all selected metrics share a unit
  const selectedUnits = useMemo(() => {
    return selectedKeys
      .map((k) => getSummary(k)?.latestResult.unit?.toLowerCase().trim())
      .filter(Boolean);
  }, [selectedKeys, summaries]);

  const canUseActualValues = useMemo(() => {
    return (
      selectedUnits.length > 0 &&
      selectedUnits.every((u) => u === selectedUnits[0])
    );
  }, [selectedUnits]);

  // If actual values is selected but metrics have differing units, revert quietly to relative
  useEffect(() => {
    if (scaleMode === "actual" && !canUseActualValues) {
      setScaleMode("relative");
    }
  }, [canUseActualValues, scaleMode]);

  // Toggle selection
  const handleToggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length > 1) {
        setSelectedKeys(selectedKeys.filter((k) => k !== key));
      }
    } else {
      if (selectedKeys.length < 4) {
        setSelectedKeys([...selectedKeys, key]);
      }
    }
  };

  // Combine dates across selected metrics and format data
  const { chartData, xDomain, xTicks, yDomain } = useMemo(() => {
    if (selectedKeys.length === 0) {
      return { chartData: [], xDomain: [0, 1], xTicks: [], yDomain: [0, 100] };
    }

    const dateMap = new Map<
      number,
      { timestamp: number; date: string; formattedDate: string; [key: string]: any }
    >();

    for (const key of selectedKeys) {
      const hist = allHistory[key] || [];
      const summary = getSummary(key);
      const def = METRIC_DICTIONARY[key];
      const low = summary?.latestResult.refLow ?? def?.defaultLow;
      const high = summary?.latestResult.refHigh ?? def?.defaultHigh;

      for (const item of hist) {
        const ts = new Date(item.reportDate).getTime();
        if (!dateMap.has(ts)) {
          dateMap.set(ts, {
            timestamp: ts,
            date: item.reportDate,
            formattedDate: formatDate(item.reportDate),
          });
        }
        const record = dateMap.get(ts)!;
        record[key] = item.value;

        // Relative to normal calculation: 0% = low, 100% = high
        let relVal: number | null = null;
        if (low !== undefined && high !== undefined && high > low) {
          relVal = ((item.value - low) / (high - low)) * 100;
        } else if (high !== undefined && low === undefined) {
          relVal = (item.value / high) * 100;
        } else if (low !== undefined && high === undefined) {
          relVal = 50 + ((item.value - low) / low) * 50;
        }
        if (relVal !== null) {
          record[`${key}_rel`] = Number(relVal.toFixed(1));
        }
      }
    }

    // Min/Max fallback for metrics without reference bounds in relative mode
    for (const key of selectedKeys) {
      const hasRel = Array.from(dateMap.values()).some((r) => r[`${key}_rel`] !== undefined);
      if (!hasRel) {
        const vals = Array.from(dateMap.values())
          .map((r) => r[key])
          .filter((v): v is number => typeof v === "number" && !isNaN(v));
        if (vals.length > 0) {
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const span = max - min;
          for (const rec of dateMap.values()) {
            if (typeof rec[key] === "number") {
              rec[`${key}_rel`] =
                span === 0 ? 50 : Number((((rec[key] - min) / span) * 100).toFixed(1));
            }
          }
        }
      }
    }

    // Sort chronologically
    let sorted = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Apply time filter
    if (timeFilter !== "all" && sorted.length > 0) {
      const latestTime = sorted[sorted.length - 1].timestamp;
      const days = timeFilter === "3m" ? 90 : timeFilter === "6m" ? 180 : 365;
      const cutoff = latestTime - days * 24 * 3600 * 1000;
      const filtered = sorted.filter((d) => d.timestamp >= cutoff);
      if (filtered.length > 0) sorted = filtered;
    }

    // X-axis time-scaled domain and ticks
    const timestamps = sorted.map((d) => d.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const ticks = Array.from(new Set(timestamps)).sort((a, b) => a - b);
    const timeDomain =
      minTime === maxTime
        ? [minTime - 30 * 86400000, maxTime + 30 * 86400000]
        : [minTime - (maxTime - minTime) * 0.08, maxTime + (maxTime - minTime) * 0.08];

    // Y-axis domain
    let yDomainResult: [number | "auto", number | "auto"] = ["auto", "auto"];
    if (scaleMode === "relative") {
      const allRels: number[] = [];
      for (const r of sorted) {
        for (const k of selectedKeys) {
          if (typeof r[`${k}_rel`] === "number") allRels.push(r[`${k}_rel`]);
        }
      }
      if (allRels.length > 0) {
        const minVal = Math.min(...allRels, 0);
        const maxVal = Math.max(...allRels, 100);
        const span = Math.max(maxVal - minVal, 50);
        yDomainResult = [Math.floor(minVal - span * 0.1), Math.ceil(maxVal + span * 0.1)];
      } else {
        yDomainResult = [-10, 110];
      }
    } else {
      const allVals: number[] = [];
      for (const r of sorted) {
        for (const k of selectedKeys) {
          if (typeof r[k] === "number") allVals.push(r[k]);
        }
      }
      if (allVals.length > 0) {
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const span = Math.max(maxVal - minVal, 1);
        yDomainResult = [Math.floor(minVal - span * 0.15), Math.ceil(maxVal + span * 0.15)];
      }
    }

    return {
      chartData: sorted,
      xDomain: timeDomain,
      xTicks: ticks,
      yDomain: yDomainResult,
    };
  }, [selectedKeys, allHistory, timeFilter, scaleMode]);

  // Distinct marker shapes for accessibility without relying on color alone
  const renderDotShape = (index: number, color: string) => (props: any) => {
    const { cx, cy } = props;
    if (cx === undefined || cy === undefined) return null;
    const key = `dot-${index}-${cx}-${cy}`;
    if (index === 0) {
      return (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={3.5}
          fill={color}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
        />
      );
    } else if (index === 1) {
      return (
        <rect
          key={key}
          x={cx - 3}
          y={cy - 3}
          width={6}
          height={6}
          fill={color}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
          rx={1}
        />
      );
    } else if (index === 2) {
      return (
        <polygon
          key={key}
          points={`${cx},${cy - 4} ${cx + 4},${cy + 3.5} ${cx - 4},${cy + 3.5}`}
          fill={color}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
        />
      );
    } else {
      return (
        <polygon
          key={key}
          points={`${cx},${cy - 4} ${cx + 3.5},${cy} ${cx},${cy + 4} ${cx - 3.5},${cy}`}
          fill={color}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
        />
      );
    }
  };

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-5",
        className
      )}
    >
      {/* Header & Controls: Short labels only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Overlay
          </h3>
          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
            ({selectedKeys.length}/4)
          </span>
        </div>

        {/* Scale mode & Time filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={[
              { value: "relative", label: "Relative" },
              {
                value: "actual",
                label: "Actual values",
                disabled: !canUseActualValues,
                title: !canUseActualValues
                  ? "All selected metrics must share a unit"
                  : undefined,
              },
            ]}
            value={scaleMode}
            onChange={(v) => setScaleMode(v as "relative" | "actual")}
          />

          <SegmentedControl
            options={[
              { value: "3m", label: "3M" },
              { value: "6m", label: "6M" },
              { value: "1y", label: "1Y" },
              { value: "all", label: "All" },
            ]}
            value={timeFilter}
            onChange={(v) => setTimeFilter(v as "3m" | "6m" | "1y" | "all")}
          />
        </div>
      </div>

      {/* Legend chips: color dot, short name, latest value, remove (x) */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedKeys.map((key, index) => {
          const summary = getSummary(key);
          const color = OVERLAY_COLORS[index % OVERLAY_COLORS.length];
          const shortName = summary ? getShortName(summary.displayName) : key;
          return (
            <div
              key={key}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] select-none"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{shortName}</span>
              {summary && (
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {summary.latestResult.value} {summary.latestResult.unit}
                </span>
              )}
              {selectedKeys.length > 1 && (
                <button
                  onClick={() => handleToggleKey(key)}
                  className="text-[var(--text-muted)] hover:text-[var(--status-abnormal-text)] cursor-pointer p-0.5 ml-0.5 rounded transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label={`Remove ${shortName}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Recharts Overlay Chart */}
      <div className="w-full h-72 sm:h-80 select-none">
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

            {/* Shaded 0–100% normal band in Relative mode */}
            {scaleMode === "relative" && (
              <ReferenceArea
                y1={0}
                y2={100}
                fill="var(--status-normal-bg)"
                stroke="var(--status-normal-dot)"
                strokeDasharray="2 2"
                strokeOpacity={0.25}
              />
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
              unit={scaleMode === "relative" ? "%" : undefined}
            />

            {/* Unified tooltip showing real values and units */}
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "2 2" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const record = payload[0].payload;
                  return (
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-xs space-y-2 min-w-[170px]">
                      <span className="font-semibold text-[var(--text-primary)] block border-b border-[var(--border-subtle)] pb-1.5">
                        {record.formattedDate}
                      </span>
                      <div className="space-y-1.5">
                        {selectedKeys.map((key, i) => {
                          const val = record[key];
                          if (val === undefined) return null;
                          const summary = getSummary(key);
                          const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
                          const shortName = summary ? getShortName(summary.displayName) : key;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-[var(--text-secondary)] truncate">
                                  {shortName}
                                </span>
                              </div>
                              <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                                {val} {summary?.latestResult.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {selectedKeys.map((key, i) => {
              const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
              const summary = getSummary(key);
              const dataKey = scaleMode === "relative" ? `${key}_rel` : key;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={dataKey}
                  name={summary ? getShortName(summary.displayName) : key}
                  stroke={color}
                  strokeWidth={2}
                  dot={renderDotShape(i, color)}
                  activeDot={{ r: 6, fill: color }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Picker Below: short names, accent border + check, quiet disable at 4 */}
      <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--text-muted)]">
            Select metrics{" "}
            {selectedKeys.length >= 4 && (
              <span className="text-[var(--text-muted)] opacity-75">(4 selected)</span>
            )}
          </span>
          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
            {selectedKeys.length}/4
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto py-1">
          {summaries.map((s) => {
            const isSelected = selectedKeys.includes(s.metricKey);
            const disabled = !isSelected && selectedKeys.length >= 4;
            const shortName = getShortName(s.displayName);
            const colorIndex = selectedKeys.indexOf(s.metricKey);
            const color =
              colorIndex >= 0 ? OVERLAY_COLORS[colorIndex % OVERLAY_COLORS.length] : undefined;

            return (
              <button
                key={s.metricKey}
                onClick={() => handleToggleKey(s.metricKey)}
                disabled={disabled}
                title={disabled ? "Maximum 4 metrics selected" : s.displayName}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-[background-color,border-color,color] duration-[120ms]",
                  "border select-none",
                  isSelected
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--accent)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer"
                    : disabled
                    ? "bg-[var(--bg-card-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] opacity-40 cursor-not-allowed"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] cursor-pointer"
                )}
              >
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span>{shortName}</span>
                {isSelected && <Check className="w-3 h-3 text-[var(--accent)] shrink-0 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
