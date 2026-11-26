"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Report, Result, MetricCategory } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "./ui/Badge";
import { getShortName } from "./BiomarkerCard";
import {
  useTranslation,
  getLocalizedPanelName,
  getLocalizedFlagLabel,
} from "@/lib/i18n/translations";
import { getLocalizedMetricName } from "@/lib/i18n/metricTranslations";
import { ArrowUp, ArrowDown, Minus, GitCompare, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ReportCompareViewProps {
  reports: Report[];
  className?: string;
}

interface ComparedRow {
  metricKey: string;
  displayName: string;
  category: MetricCategory;
  unit: string;
  resultA?: Result;
  resultB?: Result;
  diff?: number;
  pctChange?: number;
  statusShift?: "improved" | "worsened" | "same";
}

export function ReportCompareView({ reports, className }: ReportCompareViewProps) {
  const { t, language } = useTranslation();

  if (reports.length < 2) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
        <GitCompare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
        <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">
          Need at least two reports to compare
        </h4>
        <p className="text-[13px] text-[var(--text-muted)] max-w-sm mx-auto">
          Upload another health report to see side-by-side metric comparisons.
        </p>
      </div>
    );
  }

  // Default: Report A = latest report (index 0), Report B = previous report (index 1)
  const [reportIdA, setReportIdA] = useState<number>(reports[0].id!);
  const [reportIdB, setReportIdB] = useState<number>(reports[1].id!);
  const [resultsA, setResultsA] = useState<Result[]>([]);
  const [resultsB, setResultsB] = useState<Result[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Load results for both reports
  useEffect(() => {
    async function loadReportResults() {
      try {
        const resA = await db.results.where("reportId").equals(reportIdA).toArray();
        const resB = await db.results.where("reportId").equals(reportIdB).toArray();
        setResultsA(resA);
        setResultsB(resB);
      } catch (err) {
        console.error("Failed to load comparison data:", err);
      }
    }
    loadReportResults();
  }, [reportIdA, reportIdB]);

  const reportA = useMemo(() => reports.find((r) => r.id === reportIdA), [reports, reportIdA]);
  const reportB = useMemo(() => reports.find((r) => r.id === reportIdB), [reports, reportIdB]);

  // Combine rows by metricKey
  const comparedRows = useMemo(() => {
    const map = new Map<string, ComparedRow>();

    // Process Report B (baseline/older)
    for (const b of resultsB) {
      map.set(b.metricKey, {
        metricKey: b.metricKey,
        displayName: b.displayName,
        category: b.category,
        unit: b.unit,
        resultB: b,
      });
    }

    // Process Report A (newer)
    for (const a of resultsA) {
      if (!map.has(a.metricKey)) {
        map.set(a.metricKey, {
          metricKey: a.metricKey,
          displayName: a.displayName,
          category: a.category,
          unit: a.unit,
          resultA: a,
        });
      } else {
        const row = map.get(a.metricKey)!;
        row.resultA = a;
        if (!row.unit && a.unit) row.unit = a.unit;
      }
    }

    // Calculate diffs and status shifts
    const rows: ComparedRow[] = [];
    for (const row of map.values()) {
      if (row.resultA && row.resultB) {
        const valA = row.resultA.value;
        const valB = row.resultB.value;
        row.diff = Number((valA - valB).toFixed(2));
        if (valB !== 0) {
          row.pctChange = Number((((valA - valB) / valB) * 100).toFixed(1));
        }

        const flagA = row.resultA.flag;
        const flagB = row.resultB.flag;

        if (flagB !== "normal" && flagA === "normal") {
          row.statusShift = "improved";
        } else if (flagB === "normal" && flagA !== "normal") {
          row.statusShift = "worsened";
        } else {
          row.statusShift = "same";
        }
      }
      rows.push(row);
    }

    return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [resultsA, resultsB]);

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of comparedRows) {
      if (r.category) set.add(r.category);
    }
    return ["All", ...Array.from(set)];
  }, [comparedRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return comparedRows.filter((r) => {
      const localizedName = getLocalizedMetricName(r.metricKey, r.displayName, language).toLowerCase();
      const localizedCat = getLocalizedPanelName(r.category, language).toLowerCase();
      const matchSearch =
        r.displayName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        localizedName.includes(q) ||
        localizedCat.includes(q);
      const matchCat = categoryFilter === "All" || r.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [comparedRows, searchQuery, categoryFilter, language]);

  // Overall Comparison Stats
  const summaryStats = useMemo(() => {
    let improved = 0;
    let worsened = 0;
    let same = 0;

    for (const r of comparedRows) {
      if (r.statusShift === "improved") improved++;
      else if (r.statusShift === "worsened") worsened++;
      else if (r.resultA && r.resultB) same++;
    }

    return {
      comparedCount: comparedRows.filter((r) => r.resultA && r.resultB).length,
      improved,
      worsened,
      same,
    };
  }, [comparedRows]);

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-5",
        className
      )}
    >
      {/* Title & Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Compare reports
          </h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Select two checkup dates to inspect changes.
          </p>
        </div>

        {/* Date Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">Recent:</span>
            <select
              value={reportIdA}
              onChange={(e) => setReportIdA(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
            >
              {reports.map((r) => (
                <option key={`a-${r.id}`} value={r.id}>
                  {formatDate(r.reportDate)} ({r.labName || "Lab"})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[12px] text-[var(--text-muted)]">vs</span>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-muted)]">Baseline:</span>
            <select
              value={reportIdB}
              onChange={(e) => setReportIdB(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
            >
              {reports.map((r) => (
                <option key={`b-${r.id}`} value={r.id}>
                  {formatDate(r.reportDate)} ({r.labName || "Lab"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Compared tests
          </span>
          <span className="text-[20px] font-semibold text-[var(--text-primary)] block mt-0.5 tabular-nums">
            {summaryStats.comparedCount}
          </span>
        </div>
        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Normalized
          </span>
          <span className="text-[20px] font-semibold text-[var(--status-normal-text)] block mt-0.5 tabular-nums">
            {summaryStats.improved}
          </span>
        </div>
        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Out of range
          </span>
          <span className="text-[20px] font-semibold text-[var(--status-abnormal-text)] block mt-0.5 tabular-nums">
            {summaryStats.worsened}
          </span>
        </div>
        <div>
          <span className="text-[12px] text-[var(--text-muted)] block">
            Stable
          </span>
          <span className="text-[20px] font-semibold text-[var(--text-muted)] block mt-0.5 tabular-nums">
            {summaryStats.same}
          </span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search metric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[12px] font-medium transition-[background-color,color] duration-[120ms] shrink-0 cursor-pointer",
                categoryFilter === cat
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {cat === "All" ? t.all : getLocalizedPanelName(cat, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-x-auto bg-[var(--bg-card)]">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[12px] font-medium text-[var(--text-muted)]">
              <th className="p-3">Biomarker</th>
              <th className="p-3">
                {reportB ? formatDate(reportB.reportDate) : "Baseline"}
              </th>
              <th className="p-3">
                {reportA ? formatDate(reportA.reportDate) : "Recent"}
              </th>
              <th className="p-3 text-right">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {filteredRows.map((row) => {
              const resA = row.resultA;
              const resB = row.resultB;
              const shortName =
                language === "en"
                  ? getShortName(row.displayName)
                  : getLocalizedMetricName(row.metricKey, row.displayName, language);

              return (
                <tr
                  key={row.metricKey}
                  className="hover:bg-[var(--bg-card-subtle)]/50 transition-colors"
                >
                  {/* Biomarker Name */}
                  <td className="p-3">
                    <span className="font-medium text-[var(--text-primary)] block">
                      {shortName}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {getLocalizedPanelName(row.category, language)}
                    </span>
                  </td>

                  {/* Report B (Baseline) */}
                  <td className="p-3">
                    {resB ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] tabular-nums">
                          {resB.value} {resB.unit}
                        </span>
                        {resB.flag !== "normal" && (
                          <Badge variant={resB.flag} size="sm">
                            {getLocalizedFlagLabel(resB.flag, language)}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] italic text-[12px]">Not tested</span>
                    )}
                  </td>

                  {/* Report A (Recent) */}
                  <td className="p-3">
                    {resA ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] tabular-nums">
                          {resA.value} {resA.unit}
                        </span>
                        {resA.flag !== "normal" && (
                          <Badge variant={resA.flag} size="sm">
                            {getLocalizedFlagLabel(resA.flag, language)}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] italic text-[12px]">Not tested</span>
                    )}
                  </td>

                  {/* Difference */}
                  <td className="p-3 text-right">
                    {row.diff !== undefined ? (
                      <div className="inline-flex flex-col items-end">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium tabular-nums",
                            row.statusShift === "improved"
                              ? "text-[var(--status-normal-text)]"
                              : row.statusShift === "worsened"
                              ? "text-[var(--status-abnormal-text)]"
                              : "text-[var(--text-muted)]"
                          )}
                        >
                          {row.diff > 0 ? (
                            <ArrowUp className="w-3 h-3 text-[var(--text-muted)]" />
                          ) : row.diff < 0 ? (
                            <ArrowDown className="w-3 h-3 text-[var(--text-muted)]" />
                          ) : (
                            <Minus className="w-3 h-3 text-[var(--text-muted)]" />
                          )}
                          <span>
                            {row.diff > 0 ? `+${row.diff}` : row.diff} {row.unit}
                          </span>
                        </span>
                        {row.pctChange !== undefined && (
                          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {row.pctChange > 0 ? `+${row.pctChange}%` : `${row.pctChange}%`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
