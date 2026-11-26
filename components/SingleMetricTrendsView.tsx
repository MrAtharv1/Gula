"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Info,
  Table as TableIcon,
  LayoutList,
  SlidersHorizontal,
} from "lucide-react";
import {
  LatestResultSummary,
  ResultWithDate,
  Report,
  MetricCategory,
  ResultFlag,
  MetricDefinition,
} from "@/lib/db/schema";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";

export type TrendFilterType =
  | "all"
  | "attention_improved"
  | "attention_worsen"
  | "border_range";

export interface BiomarkerFilterClassification {
  isBorderRange: boolean;
  isAttentionImproved: boolean;
  isAttentionWorsen: boolean;
  needsAttention: boolean;
}

const CATEGORY_PANEL_NAMES: Record<string, string> = {
  Liver: "Liver Function",
  Sugar: "Metabolic Panel",
  Lipids: "Lipid Panel",
  Blood: "Complete Blood Count",
  Kidney: "Kidney Function",
  Thyroid: "Thyroid Panel",
  Vitamins: "Vitamins & Minerals",
  Hormones: "Hormone Panel",
  Other: "General Biomarkers",
};

/**
 * Calculates absolute distance of a result from the healthy normal reference range.
 * Returns 0 if within normal range or flagged borderline.
 */
export function getDistanceToNormalRange(
  result: ResultWithDate,
  fallbackDef?: MetricDefinition
): number {
  if (result.flag === "borderline") return 0;

  const val = result.value;
  const refLow = result.refLow ?? fallbackDef?.defaultLow;
  const refHigh = result.refHigh ?? fallbackDef?.defaultHigh;

  if (refLow != null && val < refLow) {
    return refLow - val;
  }
  if (refHigh != null && val > refHigh) {
    return val - refHigh;
  }
  if (result.flag === "low" && refLow != null) {
    return Math.max(refLow - val, 0.01);
  }
  if (result.flag === "high" && refHigh != null) {
    return Math.max(val - refHigh, 0.01);
  }
  return 0;
}

/**
 * Checks whether a single report reading is out of healthy reference bounds.
 * Borderline readings are treated as within border range.
 */
export function isResultOutOfRange(
  result: ResultWithDate,
  fallbackDef?: MetricDefinition
): boolean {
  if (result.flag === "borderline") return false;
  if (result.flag === "high" || result.flag === "low") return true;
  return getDistanceToNormalRange(result, fallbackDef) > 0;
}

/**
 * Classifies a biomarker across the last 5 reports:
 * 1. If even one value in any report (last 5) is out of range:
 *    - "Need attention but improved": latest value is closer to normal range than the second last report
 *    - "Need attention and worsen": latest value is further away from range than the second last report
 * 2. "Within border range": ALL values in every report (last 5) are within range / border range
 * 3. "All": all biomarkers
 */
export function classifyBiomarkerStatus(
  summary: LatestResultSummary
): BiomarkerFilterClassification {
  const dictDef = METRIC_DICTIONARY[summary.metricKey];

  // Get chronological history and inspect up to the last 5 reports
  const sorted =
    summary.history && summary.history.length > 0
      ? [...summary.history].sort(
          (a, b) =>
            new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
        )
      : [summary.latestResult];

  const last5 = sorted.slice(-5);

  const hasAnyOutOfRangeInLast5 = last5.some((r) =>
    isResultOutOfRange(r, dictDef)
  );

  let isBorderRange = false;
  let isAttentionImproved = false;
  let isAttentionWorsen = false;

  if (!hasAnyOutOfRangeInLast5) {
    // All numbers in every report (last 5) are within range / border range
    isBorderRange = true;
  } else {
    // At least one report in last 5 was out of range
    const latest = last5[last5.length - 1];
    const secondLast = last5.length >= 2 ? last5[last5.length - 2] : null;

    const distLatest = getDistanceToNormalRange(latest, dictDef);

    if (secondLast) {
      const distSecondLast = getDistanceToNormalRange(secondLast, dictDef);

      if (distLatest < distSecondLast) {
        // Latest value is closer to normal range than second last report
        isAttentionImproved = true;
      } else {
        // Latest value is further away from range than second last report (or equal)
        isAttentionWorsen = true;
      }
    } else {
      // Only 1 report on record and it is out of range
      isAttentionWorsen = true;
    }
  }

  return {
    isBorderRange,
    isAttentionImproved,
    isAttentionWorsen,
    needsAttention: hasAnyOutOfRangeInLast5,
  };
}

export interface ResultColorDetails {
  dotColor: string;
  pillBgClass: string;
  pillTextClass: string;
  pillBorderClass: string;
  flagIcon: "up" | "down" | "border" | "check";
  severityRatio: number;
}

/**
 * Computes dynamic colors for dots and pills:
 * - Out-of-range: Lighter shade of red when closer to border, darker red when further away
 * - Border-range: Lighter orange when closer to normal, darker orange when near out-of-range edge
 * - Normal: Soft emerald green
 */
export function getReadingColorDetails(
  value: number,
  refLow?: number,
  refHigh?: number,
  flag?: ResultFlag
): ResultColorDetails {
  const span =
    refLow != null && refHigh != null && refHigh > refLow
      ? refHigh - refLow
      : refHigh
      ? refHigh * 0.6
      : refLow
      ? refLow * 0.6
      : Math.max(Math.abs(value) * 0.4, 1);

  const isExplicitBorder = flag === "borderline";
  const borderMargin = span * 0.08;

  // Check Out-of-Range (High or Low) - only if NOT explicitly borderline
  const isHigh =
    !isExplicitBorder &&
    (flag === "high" || (refHigh != null && value > refHigh));
  const isLow =
    !isExplicitBorder &&
    (flag === "low" || (refLow != null && value < refLow));

  if (isHigh || isLow) {
    const dist = isHigh
      ? value - (refHigh ?? value)
      : (refLow ?? value) - value;

    // Severity ratio (0 = right at border, 1 = severely far)
    const severity = Math.min(Math.max(dist / (span * 0.45), 0.05), 1.0);

    // Light red (hsl(0, 85%, 68%)) -> Dark red (hsl(0, 85%, 36%))
    const lightness = Math.round(68 - severity * 32);
    const dotColor = `hsl(0, 85%, ${lightness}%)`;

    let pillBgClass = "bg-rose-50/90 dark:bg-rose-950/35";
    let pillTextClass = "text-rose-600 dark:text-rose-400";
    let pillBorderClass = "border-rose-200/70 dark:border-rose-900/40";

    if (severity > 0.65) {
      // Dark red shade
      pillBgClass = "bg-rose-100 dark:bg-rose-950/75";
      pillTextClass = "text-rose-800 dark:text-rose-200 font-semibold";
      pillBorderClass = "border-rose-300 dark:border-rose-800";
    } else if (severity > 0.3) {
      // Medium red shade
      pillBgClass = "bg-rose-50 dark:bg-rose-950/50";
      pillTextClass = "text-rose-700 dark:text-rose-300 font-medium";
      pillBorderClass = "border-rose-200 dark:border-rose-850/60";
    }

    return {
      dotColor,
      pillBgClass,
      pillTextClass,
      pillBorderClass,
      flagIcon: isHigh ? "up" : "down",
      severityRatio: severity,
    };
  }

  // Border range evaluation
  const nearLow = refLow != null && Math.abs(value - refLow) <= borderMargin;
  const nearHigh = refHigh != null && Math.abs(value - refHigh) <= borderMargin;
  const isBorder = isExplicitBorder || nearLow || nearHigh;

  if (isBorder) {
    // 0 = close to safe normal, 1 = right on edge of out-of-range
    let borderSeverity = 0.5;
    if (refHigh != null && value >= refHigh - borderMargin) {
      borderSeverity = Math.min(
        Math.max((value - (refHigh - borderMargin)) / (2 * borderMargin), 0.05),
        1.0
      );
    } else if (refLow != null && value <= refLow + borderMargin) {
      borderSeverity = Math.min(
        Math.max(((refLow + borderMargin) - value) / (2 * borderMargin), 0.05),
        1.0
      );
    }

    // Light orange (hsl(38, 95%, 64%)) -> Dark orange (hsl(24, 95%, 44%))
    const hue = Math.round(38 - borderSeverity * 14);
    const lightness = Math.round(64 - borderSeverity * 20);
    const dotColor = `hsl(${hue}, 95%, ${lightness}%)`;

    let pillBgClass = "bg-amber-50 dark:bg-amber-950/40";
    let pillTextClass = "text-amber-700 dark:text-amber-300 font-medium";
    let pillBorderClass = "border-amber-200/80 dark:border-amber-900/40";

    if (borderSeverity > 0.6) {
      // Dark orange shade
      pillBgClass = "bg-amber-100 dark:bg-amber-950/70";
      pillTextClass = "text-amber-900 dark:text-amber-200 font-semibold";
      pillBorderClass = "border-amber-300 dark:border-amber-800";
    }

    return {
      dotColor,
      pillBgClass,
      pillTextClass,
      pillBorderClass,
      flagIcon: "border",
      severityRatio: borderSeverity,
    };
  }

  // In-Range / Normal
  return {
    dotColor: "#10b981",
    pillBgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    pillTextClass: "text-emerald-700 dark:text-emerald-400 font-medium",
    pillBorderClass: "border-emerald-200/80 dark:border-emerald-900/40",
    flagIcon: "check",
    severityRatio: 0,
  };
}

/**
 * Format date for table column headers (e.g. "Nov 2022")
 */
function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Format date for mobile card row items (e.g. "Nov 25, 2024")
 */
function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Realistic SVG Sparkline:
 * - Scaled proportionally against (min border, max border) so larger differences yield steeper, realistic slopes
 * - Visual dashed guide for normal reference range
 * - Dynamic dot shading from light red to dark red (out-of-range) and light orange to dark orange (borderline)
 */
export function TrendSparkline({
  history,
  refLow,
  refHigh,
  width = 88,
  height = 30,
  className,
}: {
  history?: ResultWithDate[];
  refLow?: number;
  refHigh?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  );

  const values = sorted.map((p) => p.value);
  const paddingX = 8;
  const paddingY = 6;

  // Compute physiological envelope including reference borders
  const refSpan =
    refLow != null && refHigh != null && refHigh > refLow
      ? refHigh - refLow
      : refHigh
      ? refHigh * 0.5
      : refLow
      ? refLow * 0.5
      : Math.max(...values) - Math.min(...values) || 1;

  const envelopeMin = Math.min(...values, refLow ?? Math.min(...values));
  const envelopeMax = Math.max(...values, refHigh ?? Math.max(...values));
  const fullSpan = Math.max(envelopeMax - envelopeMin, refSpan * 0.75, 0.0001);

  // 12% vertical padding
  const yMin = envelopeMin - fullSpan * 0.12;
  const yMax = envelopeMax + fullSpan * 0.12;
  const ySpan = yMax - yMin;

  const scaleY = (val: number) => {
    return height - paddingY - ((val - yMin) / ySpan) * (height - 2 * paddingY);
  };

  // Single point rendering
  if (sorted.length === 1) {
    const pt = sorted[0];
    const colorInfo = getReadingColorDetails(
      pt.value,
      pt.refLow ?? refLow,
      pt.refHigh ?? refHigh,
      pt.flag
    );
    const cy = scaleY(pt.value);

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`shrink-0 overflow-visible ${className || ""}`}
      >
        <line
          x1={paddingX}
          y1={cy}
          x2={width - paddingX}
          y2={cy}
          stroke="var(--border-strong)"
          strokeDasharray="2 2"
          strokeWidth={1}
        />
        <circle
          cx={width / 2}
          cy={cy}
          r={3.5}
          fill={colorInfo.dotColor}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  // Multi-point coordinates
  const points = sorted.map((pt, i) => {
    const x = paddingX + (i / (sorted.length - 1)) * (width - 2 * paddingX);
    const y = scaleY(pt.value);
    const colorInfo = getReadingColorDetails(
      pt.value,
      pt.refLow ?? refLow,
      pt.refHigh ?? refHigh,
      pt.flag
    );
    return { x, y, colorInfo, pt };
  });

  // Smooth bezier curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  // Reference range guideline coordinates
  const hasRefBorders = refLow != null && refHigh != null && refHigh > refLow;
  const yRefHigh = hasRefBorders ? scaleY(refHigh!) : null;
  const yRefLow = hasRefBorders ? scaleY(refLow!) : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className || ""}`}
    >
      {/* Background normal reference range zone */}
      {hasRefBorders && yRefHigh != null && yRefLow != null && (
        <rect
          x={paddingX - 2}
          y={Math.min(yRefHigh, yRefLow)}
          width={width - 2 * paddingX + 4}
          height={Math.max(Math.abs(yRefLow - yRefHigh), 1)}
          fill="#10b981"
          fillOpacity={0.07}
          rx={2}
        />
      )}

      {/* Realistic curve path */}
      <path
        d={pathD}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Shaded points: light-to-dark red & light-to-dark orange */}
      {points.map((p, idx) => (
        <circle
          key={idx}
          cx={p.x}
          cy={p.y}
          r={3.2}
          fill={p.colorInfo.dotColor}
          stroke="var(--bg-card)"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

/**
 * Result Pill with dynamic gradient shading:
 * - Light to dark red as distance from border increases
 * - Light to dark orange for borderline readings
 * - Emerald green for normal readings
 */
export function ResultPill({ result }: { result?: ResultWithDate }) {
  if (!result) {
    return (
      <span className="text-[var(--text-muted)] text-[13px] font-medium">-</span>
    );
  }

  const colorInfo = getReadingColorDetails(
    result.value,
    result.refLow,
    result.refHigh,
    result.flag
  );

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-md border text-[12px] whitespace-nowrap transition-colors ${colorInfo.pillBgClass} ${colorInfo.pillTextClass} ${colorInfo.pillBorderClass}`}
    >
      {colorInfo.flagIcon === "up" && (
        <ArrowUp className="w-3 h-3 shrink-0" />
      )}
      {colorInfo.flagIcon === "down" && (
        <ArrowDown className="w-3 h-3 shrink-0" />
      )}
      {colorInfo.flagIcon === "border" && (
        <AlertCircle className="w-3 h-3 shrink-0" />
      )}
      {colorInfo.flagIcon === "check" && (
        <Check className="w-3 h-3 shrink-0" />
      )}
      <span>{result.value}</span>
      <span className="text-[10px] opacity-80">{result.unit}</span>
    </span>
  );
}

interface SingleMetricTrendsViewProps {
  summaries: LatestResultSummary[];
  reports: Report[];
  onOpenDetail?: (summary: LatestResultSummary) => void;
  className?: string;
}

export function SingleMetricTrendsView({
  summaries,
  reports,
  onOpenDetail,
  className,
}: SingleMetricTrendsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPanel, setSelectedPanel] = useState<string>("all");
  const [selectedFilters, setSelectedFilters] = useState<Set<TrendFilterType>>(
    new Set(["all"])
  );
  const [viewMode, setViewMode] = useState<"auto" | "table" | "cards">("auto");
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());

  // Collect all unique chronological report dates
  const uniqueDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const r of reports) {
      if (r.reportDate) datesSet.add(r.reportDate);
    }
    for (const s of summaries) {
      if (s.history) {
        for (const h of s.history) {
          if (h.reportDate) datesSet.add(h.reportDate);
        }
      }
    }
    return Array.from(datesSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [reports, summaries]);

  // Pre-classify all summaries based on the last 5 reports
  const classifications = useMemo(() => {
    const map = new Map<string, BiomarkerFilterClassification>();
    for (const s of summaries) {
      map.set(s.metricKey, classifyBiomarkerStatus(s));
    }
    return map;
  }, [summaries]);

  // Compute counts for the 4 filter options
  const filterCounts = useMemo(() => {
    let improved = 0;
    let worsen = 0;
    let border = 0;

    for (const s of summaries) {
      const c = classifications.get(s.metricKey);
      if (c?.isAttentionImproved) improved++;
      if (c?.isAttentionWorsen) worsen++;
      if (c?.isBorderRange) border++;
    }

    return {
      all: summaries.length,
      attention_improved: improved,
      attention_worsen: worsen,
      border_range: border,
    };
  }, [summaries, classifications]);

  // Toggle checkbox filters with multi-select support
  const handleToggleFilter = (filter: TrendFilterType) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);

      if (filter === "all") {
        return new Set(["all"]);
      }

      next.delete("all");

      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }

      // If empty or all 3 selected, revert to "all"
      if (next.size === 0 || next.size === 3) {
        return new Set(["all"]);
      }

      return next;
    });
  };

  // Toggle accordion collapse
  const handleTogglePanel = (panelName: string) => {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelName)) {
        next.delete(panelName);
      } else {
        next.add(panelName);
      }
      return next;
    });
  };

  // Filter biomarkers by search, panel, and the 4 checkboxes
  const filteredSummaries = useMemo(() => {
    return summaries.filter((summary) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = summary.displayName.toLowerCase().includes(query);
        const matchesCategory = summary.category.toLowerCase().includes(query);
        const matchesKey = summary.metricKey.toLowerCase().includes(query);
        const dictDef = METRIC_DICTIONARY[summary.metricKey];
        const matchesAlias = dictDef?.aliases.some((a) =>
          a.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesCategory && !matchesKey && !matchesAlias) {
          return false;
        }
      }

      // 2. Panel Dropdown
      if (selectedPanel !== "all") {
        if (summary.category !== selectedPanel) {
          return false;
        }
      }

      // 3. The 4 Checkbox Filters
      if (selectedFilters.has("all")) {
        return true;
      }

      const c = classifications.get(summary.metricKey);
      if (!c) return false;

      let matchesFilter = false;
      if (selectedFilters.has("attention_improved") && c.isAttentionImproved) {
        matchesFilter = true;
      }
      if (selectedFilters.has("attention_worsen") && c.isAttentionWorsen) {
        matchesFilter = true;
      }
      if (selectedFilters.has("border_range") && c.isBorderRange) {
        matchesFilter = true;
      }

      return matchesFilter;
    });
  }, [summaries, searchQuery, selectedPanel, selectedFilters, classifications]);

  // Group filtered biomarkers by Category/Panel
  const groupedPanels = useMemo(() => {
    const map = new Map<string, LatestResultSummary[]>();

    for (const s of filteredSummaries) {
      const panel = CATEGORY_PANEL_NAMES[s.category] || s.category;
      if (!map.has(panel)) {
        map.set(panel, []);
      }
      map.get(panel)!.push(s);
    }

    return Array.from(map.entries()).map(([panelName, items]) => ({
      panelName,
      items,
    }));
  }, [filteredSummaries]);

  // Unique panels for the dropdown selector
  const availablePanels = useMemo(() => {
    const set = new Set<MetricCategory>();
    for (const s of summaries) {
      set.add(s.category);
    }
    return Array.from(set);
  }, [summaries]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* ── Top Bar: Search, Panel Selector & View Mode ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a biomarker..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns & View Mode */}
        <div className="flex items-center gap-2">
          {/* Panel Selector */}
          <select
            value={selectedPanel}
            onChange={(e) => setSelectedPanel(e.target.value)}
            aria-label="Select biomarker panel"
            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] cursor-pointer transition-colors"
          >
            <option value="all">All Panels</option>
            {availablePanels.map((p) => (
              <option key={p} value={p}>
                {CATEGORY_PANEL_NAMES[p] || p}
              </option>
            ))}
          </select>

          {/* View Mode Switcher */}
          <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "table" || viewMode === "auto"
                  ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Cards View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "cards"
                  ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Checkbox Filters (All, Need attention but improved, Need attention & worsen, Within border range) ── */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 mr-1 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Filters:</span>
        </span>

        {/* 1. All */}
        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all select-none ${
            selectedFilters.has("all")
              ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/40 shadow-xs"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("all")}
            onChange={() => handleToggleFilter("all")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
          />
          <span>All</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {filterCounts.all}
          </span>
        </label>

        {/* 2. Need attention but improved */}
        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all select-none ${
            selectedFilters.has("attention_improved")
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("attention_improved")}
            onChange={() => handleToggleFilter("attention_improved")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span>Need attention but improved</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {filterCounts.attention_improved}
          </span>
        </label>

        {/* 3. Need attention and worsen */}
        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all select-none ${
            selectedFilters.has("attention_worsen")
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-xs"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("attention_worsen")}
            onChange={() => handleToggleFilter("attention_worsen")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-rose-600 focus:ring-rose-500 cursor-pointer"
          />
          <span>Need attention and worsen</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {filterCounts.attention_worsen}
          </span>
        </label>

        {/* 4. Within border range */}
        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all select-none ${
            selectedFilters.has("border_range")
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("border_range")}
            onChange={() => handleToggleFilter("border_range")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <span>Within border range</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {filterCounts.border_range}
          </span>
        </label>
      </div>

      {/* ── Main Biomarker Panels Accordion ── */}
      {groupedPanels.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
          <p className="text-[14px] font-medium">No biomarkers match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedPanel("all");
              setSelectedFilters(new Set(["all"]));
            }}
            className="mt-3 text-[13px] text-[var(--accent)] hover:underline font-medium cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPanels.map(({ panelName, items }) => {
            const isCollapsed = collapsedPanels.has(panelName);

            return (
              <div
                key={panelName}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-xs"
              >
                {/* Accordion Panel Header */}
                <button
                  type="button"
                  onClick={() => handleTogglePanel(panelName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-card-subtle)]/70 hover:bg-[var(--bg-card-subtle)] transition-colors border-b border-[var(--border-subtle)] text-left cursor-pointer"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {panelName}
                    </h4>
                    <span className="text-[12px] text-[var(--text-muted)] font-normal">
                      ({items.length} {items.length === 1 ? "marker" : "markers"})
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div>
                    {/* ══ 1. DESKTOP TABLE VIEW (Image 2) ══ */}
                    <div
                      className={`overflow-x-auto ${
                        viewMode === "cards" ? "hidden" : "hidden md:block"
                      }`}
                    >
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 text-[12px] font-medium text-[var(--text-muted)]">
                            <th className="py-2.5 px-4 min-w-[180px]">Biomarker</th>
                            <th className="py-2.5 px-3 min-w-[95px] text-center">Trend</th>
                            {uniqueDates.map((dateStr) => (
                              <th
                                key={dateStr}
                                className="py-2.5 px-3 min-w-[110px] text-center tabular-nums"
                              >
                                {formatShortDate(dateStr)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {items.map((summary) => {
                            const historyMap = new Map<string, ResultWithDate>();
                            if (summary.history) {
                              for (const h of summary.history) {
                                historyMap.set(h.reportDate, h);
                              }
                            }

                            const refLow =
                              summary.latestResult.refLow ??
                              METRIC_DICTIONARY[summary.metricKey]?.defaultLow;
                            const refHigh =
                              summary.latestResult.refHigh ??
                              METRIC_DICTIONARY[summary.metricKey]?.defaultHigh;

                            return (
                              <tr
                                key={summary.metricKey}
                                className="hover:bg-[var(--bg-secondary)]/40 transition-colors group"
                              >
                                {/* Biomarker Name & Info Button */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetail?.(summary)}
                                      className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] text-left cursor-pointer transition-colors"
                                    >
                                      {summary.displayName}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetail?.(summary)}
                                      title="View detail & history chart"
                                      className="text-[var(--text-muted)] hover:text-[var(--accent)] p-0.5 rounded transition-colors"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                {/* Realistic Sparkline Column */}
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex justify-center">
                                    <TrendSparkline
                                      history={summary.history}
                                      refLow={refLow}
                                      refHigh={refHigh}
                                      width={88}
                                      height={30}
                                    />
                                  </div>
                                </td>

                                {/* Date Columns */}
                                {uniqueDates.map((dateStr) => {
                                  const res = historyMap.get(dateStr);
                                  return (
                                    <td
                                      key={dateStr}
                                      className="py-3 px-3 text-center align-middle"
                                    >
                                      <ResultPill result={res} />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ══ 2. MOBILE CARD VIEW (Image 1) ══ */}
                    <div
                      className={`divide-y divide-[var(--border-subtle)] ${
                        viewMode === "table" ? "hidden" : "md:hidden block"
                      }`}
                    >
                      {items.map((summary) => {
                        const mobileReadings = summary.history
                          ? [...summary.history].sort(
                              (a, b) =>
                                new Date(b.reportDate).getTime() -
                                new Date(a.reportDate).getTime()
                            )
                          : [summary.latestResult];

                        const refLow =
                          summary.latestResult.refLow ??
                          METRIC_DICTIONARY[summary.metricKey]?.defaultLow;
                        const refHigh =
                          summary.latestResult.refHigh ??
                          METRIC_DICTIONARY[summary.metricKey]?.defaultHigh;

                        return (
                          <div
                            key={summary.metricKey}
                            className="p-3.5 space-y-2.5 hover:bg-[var(--bg-secondary)]/30 transition-colors"
                          >
                            {/* Header row: Biomarker Name + Info button + Realistic Sparkline on right */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onOpenDetail?.(summary)}
                                  className="text-[14px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] truncate text-left cursor-pointer"
                                >
                                  {summary.displayName}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenDetail?.(summary)}
                                  title="View detail & history chart"
                                  className="text-[var(--text-muted)] hover:text-[var(--accent)] p-0.5 rounded shrink-0"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Realistic Sparkline */}
                              <TrendSparkline
                                history={summary.history}
                                refLow={refLow}
                                refHigh={refHigh}
                                width={84}
                                height={26}
                              />
                            </div>

                            {/* Stacked list of date readings with dynamic colored pills */}
                            <div className="space-y-1.5 pt-0.5">
                              {mobileReadings.map((reading, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex items-center justify-between gap-3 text-[12px]"
                                >
                                  <ResultPill result={reading} />
                                  <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                                    {formatFullDate(reading.reportDate)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
