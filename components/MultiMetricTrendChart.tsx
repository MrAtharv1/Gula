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
  Legend,
} from "recharts";
import { LatestResultSummary, ResultWithDate } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "./ui/Badge";
import { X, Plus, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const OVERLAY_COLORS = [
  "#2563eb", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
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
    // Default to lipid panel or first 3-4 metrics
    const lipidKeys = ["cholesterol_total", "ldl", "hdl", "triglycerides"];
    const foundLipids = lipidKeys.filter((k) => summaries.some((s) => s.metricKey === k));
    if (foundLipids.length >= 2) return foundLipids.slice(0, 4);
    return summaries.slice(0, Math.min(3, summaries.length)).map((s) => s.metricKey);
  }, [summaries, initialSelectedKeys]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultKeys);
  const [isNormalized, setIsNormalized] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"3m" | "6m" | "1y" | "all">("all");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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

  // Find summary by key
  const getSummary = (key: string) => summaries.find((s) => s.metricKey === key);

  // Combine dates across all selected metrics
  const combinedChartData = useMemo(() => {
    if (selectedKeys.length === 0) return [];

    // Collect all unique report dates
    const dateMap = new Map<string, Record<string, number | string>>();

    for (const key of selectedKeys) {
      const hist = allHistory[key] || [];
      for (const item of hist) {
        if (!dateMap.has(item.reportDate)) {
          dateMap.set(item.reportDate, {
            date: item.reportDate,
            formattedDate: formatDate(item.reportDate),
          });
        }
        const record = dateMap.get(item.reportDate)!;
        record[key] = item.value;
      }
    }

    // Sort chronologically ascending
    const sorted = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );

    // Apply time filter
    if (timeFilter !== "all" && sorted.length > 0) {
      const latestTime = new Date(sorted[sorted.length - 1].date as string).getTime();
      const days = timeFilter === "3m" ? 90 : timeFilter === "6m" ? 180 : 365;
      const cutoff = latestTime - days * 24 * 3600 * 1000;
      const filtered = sorted.filter((d) => new Date(d.date as string).getTime() >= cutoff);
      if (filtered.length > 0) return normalizeData(filtered);
    }

    return normalizeData(sorted);

    function normalizeData(records: Record<string, number | string>[]) {
      if (!isNormalized) return records;

      // Find min & max per metric
      const bounds: Record<string, { min: number; max: number }> = {};
      for (const key of selectedKeys) {
        const vals = records
          .map((r) => r[key])
          .filter((v): v is number => typeof v === "number" && !isNaN(v));
        if (vals.length > 0) {
          bounds[key] = {
            min: Math.min(...vals),
            max: Math.max(...vals),
          };
        }
      }

      return records.map((rec) => {
        const copy = { ...rec };
        for (const key of selectedKeys) {
          const val = copy[key];
          if (typeof val === "number" && bounds[key]) {
            const { min, max } = bounds[key];
            const span = max - min;
            // 0 - 100 scale; if constant, center at 50%
            copy[`${key}_norm`] = span === 0 ? 50 : Number((((val - min) / span) * 100).toFixed(1));
          }
        }
        return copy;
      });
    }
  }, [selectedKeys, allHistory, timeFilter, isNormalized]);

  return (
    <div
      className={cn(
        "p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs space-y-5",
        className
      )}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Multi-Metric Overlay
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              ({selectedKeys.length}/4 selected)
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Compare trajectories of up to 4 metrics on a single interactive timeline.
          </p>
        </div>

        {/* Normalized Scale Toggle and Time Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scale mode toggle */}
          <button
            onClick={() => setIsNormalized(!isNormalized)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer tap-target select-none",
              isNormalized
                ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {isNormalized ? "Normalized (0–100%)" : "Standard units"}
          </button>

          {/* Time filter buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            {(["3m", "6m", "1y", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeFilter(r)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-medium transition-all tap-target cursor-pointer",
                  timeFilter === r
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Metrics Chips & Add Dropdown */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {selectedKeys.map((key, index) => {
          const summary = getSummary(key);
          const color = OVERLAY_COLORS[index % OVERLAY_COLORS.length];
          return (
            <div
              key={key}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)]"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{summary?.displayName || key}</span>
              {summary && (
                <span className="text-[10px] text-[var(--text-muted)] font-normal">
                  ({summary.latestResult.value} {summary.latestResult.unit})
                </span>
              )}
              {selectedKeys.length > 1 && (
                <button
                  onClick={() => handleToggleKey(key)}
                  className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer ml-1"
                  aria-label={`Remove ${summary?.displayName || key}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Metric Button */}
        {selectedKeys.length < 4 && (
          <div className="relative">
            <button
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[var(--border-strong)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer tap-target"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add metric ({4 - selectedKeys.length} left)</span>
            </button>

            {/* Picker Popup */}
            {isPickerOpen && (
              <div className="absolute left-0 top-full mt-2 z-40 w-64 max-h-60 overflow-y-auto p-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-xl divide-y divide-[var(--border-subtle)]">
                {summaries
                  .filter((s) => !selectedKeys.includes(s.metricKey))
                  .map((s) => (
                    <button
                      key={s.metricKey}
                      onClick={() => {
                        handleToggleKey(s.metricKey);
                        setIsPickerOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-[var(--bg-secondary)] flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-[var(--text-primary)] block">
                          {s.displayName}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {s.category} • {s.latestResult.value} {s.latestResult.unit}
                        </span>
                      </div>
                      <Badge variant={s.latestResult.flag} size="sm">
                        {s.latestResult.flag}
                      </Badge>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recharts Overlay Chart */}
      <div className="w-full h-72 sm:h-80 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedChartData}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />

            <XAxis
              dataKey="formattedDate"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              domain={isNormalized ? [0, 100] : ["auto", "auto"]}
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dx={-4}
              unit={isNormalized ? "%" : undefined}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const record = payload[0].payload;
                  return (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-lg text-xs space-y-2 min-w-[170px]">
                      <span className="font-semibold text-[var(--text-primary)] block border-b border-[var(--border-subtle)] pb-1.5">
                        {record.formattedDate}
                      </span>
                      <div className="space-y-1.5">
                        {selectedKeys.map((key, i) => {
                          const val = record[key];
                          if (val === undefined) return null;
                          const summary = getSummary(key);
                          const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
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
                                  {summary?.displayName || key}
                                </span>
                              </div>
                              <span className="font-bold text-[var(--text-primary)] shrink-0">
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
              const dataKey = isNormalized ? `${key}_norm` : key;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={dataKey}
                  name={summary?.displayName || key}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: color, strokeWidth: 1.5, stroke: "var(--bg-card)" }}
                  activeDot={{ r: 6, fill: color }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
