"use client";

import React, { useMemo } from "react";
import { LatestResultSummary, MetricCategory } from "@/lib/db/schema";
import { BiomarkerCard } from "./BiomarkerCard";
import { CATEGORY_ORDER } from "@/lib/utils/reportView";
import { useTranslation, getLocalizedPanelName } from "@/lib/i18n/translations";
import { ChevronDown, ChevronUp, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type HomeFilterType = "all" | "out_of_range" | "within_range";

interface HomeDashboardViewProps {
  summaries: LatestResultSummary[];
  selectedFilters: Set<HomeFilterType>;
  onToggleFilter: (filter: HomeFilterType) => void;
  collapsedPanels: Set<string>;
  onTogglePanel: (panelName: string) => void;
  onOpenDetail: (summary: LatestResultSummary) => void;
}

export const HomeDashboardView = React.memo(function HomeDashboardView({
  summaries,
  selectedFilters,
  onToggleFilter,
  collapsedPanels,
  onTogglePanel,
  onOpenDetail,
}: HomeDashboardViewProps) {
  const { t, language } = useTranslation();
  // Summary strip & filter counts for the currently selected report
  const stats = useMemo(() => {
    let inRange = 0;
    let outOfRange = 0;

    for (const s of summaries) {
      if (s.latestResult.flag === "normal") {
        inRange++;
      } else {
        outOfRange++;
      }
    }

    return {
      total: summaries.length,
      inRange,
      outOfRange,
    };
  }, [summaries]);

  // Apply filter checkboxes
  const filteredSummaries = useMemo(() => {
    if (selectedFilters.has("all")) return summaries;

    const wantOut = selectedFilters.has("out_of_range");
    const wantIn = selectedFilters.has("within_range");

    return summaries.filter((s) => {
      const isNormal = s.latestResult.flag === "normal";
      if (wantOut && !isNormal) return true;
      if (wantIn && isNormal) return true;
      return false;
    });
  }, [summaries, selectedFilters]);

  // Group filtered cards by clinical panel (same categories as Trends -> Single metric)
  const groupedPanels = useMemo(() => {
    const map = new Map<MetricCategory, LatestResultSummary[]>();

    for (const s of filteredSummaries) {
      const cat = s.category || "Other";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    }

    const panels: { category: MetricCategory; panelName: string; items: LatestResultSummary[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
      const items = map.get(cat);
      if (items && items.length > 0) {
        panels.push({
          category: cat,
          panelName: getLocalizedPanelName(cat, language),
          items,
        });
      }
    }

    for (const [cat, items] of map.entries()) {
      if (!CATEGORY_ORDER.includes(cat) && items.length > 0) {
        panels.push({
          category: cat,
          panelName: getLocalizedPanelName(cat, language),
          items,
        });
      }
    }

    return panels;
  }, [filteredSummaries, language]);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 rounded-xl bg-[var(--bg-card)] home-glass-surface border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex flex-col px-4 sm:px-5 py-4 gap-1">
          <span className="text-[26px] font-semibold leading-none tabular-nums tracking-tight text-[var(--text-primary)]">
            {stats.total}
          </span>
          <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
            {t.markers}
          </span>
        </div>

        <div className="flex flex-col px-4 sm:px-5 py-4 gap-1 border-l border-[var(--border-subtle)]">
          <span className="text-[26px] font-semibold leading-none tabular-nums tracking-tight text-[var(--status-normal-text)]">
            {stats.inRange}
          </span>
          <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
            {t.inRange}
          </span>
        </div>

        <div className="flex flex-col px-4 sm:px-5 py-4 gap-1 border-l border-[var(--border-subtle)]">
          {stats.outOfRange === 0 ? (
            <>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-normal-dot)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                  {t.allGood}
                </span>
              </span>
              <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                {t.allInRange}
              </span>
            </>
          ) : (
            <>
              <span
                className="text-[26px] font-semibold leading-none tabular-nums tracking-tight"
                style={{
                  color:
                    stats.outOfRange > 2
                      ? "var(--status-abnormal-text)"
                      : "var(--status-borderline-text)",
                }}
              >
                {stats.outOfRange}
              </span>
              <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                {t.outOfRange}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Homepage Filters (All, Out of range, Within range) — matching Trends */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-[var(--bg-card)] home-glass-surface border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
        <span className="text-[12px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 mr-1 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>{t.filters}</span>
        </span>

        {/* a) All */}
        <label
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all duration-[100ms] select-none",
            selectedFilters.has("all")
              ? "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-muted)] shadow-[var(--shadow-sm)]"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          )}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("all")}
            onChange={() => onToggleFilter("all")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
          />
          <span>{t.all}</span>
          <span className="text-[11px] px-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {stats.total}
          </span>
        </label>

        {/* b) Out of range */}
        <label
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all duration-[100ms] select-none",
            selectedFilters.has("out_of_range")
              ? "bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border-[var(--status-abnormal-border)] shadow-[var(--shadow-sm)]"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          )}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("out_of_range")}
            onChange={() => onToggleFilter("out_of_range")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-rose-600 focus:ring-rose-500 cursor-pointer"
          />
          <span>{t.outOfRange}</span>
          <span className="text-[11px] px-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {stats.outOfRange}
          </span>
        </label>

        {/* c) Within range */}
        <label
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-all duration-[100ms] select-none",
            selectedFilters.has("within_range")
              ? "bg-[var(--status-normal-bg)] text-[var(--status-normal-text)] border-[var(--status-normal-border)] shadow-[var(--shadow-sm)]"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-subtle)]"
          )}
        >
          <input
            type="checkbox"
            checked={selectedFilters.has("within_range")}
            onChange={() => onToggleFilter("within_range")}
            className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span>{t.withinRange}</span>
          <span className="text-[11px] px-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] tabular-nums">
            {stats.inRange}
          </span>
        </label>
      </div>

      {/* Category Accordions — same panel separation as Trends -> Single metric, with card grid inside */}
      {groupedPanels.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] shadow-[var(--shadow-sm)]">
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            {t.noMatchingMarkers}
          </p>
          <button
            type="button"
            onClick={() => onToggleFilter("all")}
            className="mt-2.5 text-[12.5px] text-[var(--accent)] hover:underline font-medium cursor-pointer"
          >
            {t.showAllMarkers}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPanels.map(({ category, panelName, items }) => {
            const isCollapsed = collapsedPanels.has(category);

            return (
              <section
                key={category}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] home-glass-panel overflow-hidden shadow-[var(--shadow-sm)]"
              >
                <button
                  type="button"
                  onClick={() => onTogglePanel(category)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer",
                    "bg-[var(--bg-card-subtle)]/65 dark:bg-white/[0.03] hover:bg-[var(--bg-card-subtle)] dark:hover:bg-white/[0.06] transition-colors duration-[100ms]",
                    !isCollapsed && "border-b border-[var(--border-subtle)]"
                  )}
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <h2 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
                      {panelName}
                    </h2>
                    <span className="text-[12px] text-[var(--text-faint)] font-normal tabular-nums">
                      ({items.length} {items.length === 1 ? t.markerSingular : t.markerPlural})
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="p-3.5 sm:p-4">
                    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] auto-rows-fr">
                      {items.map((summary) => (
                        <BiomarkerCard
                          key={`${summary.latestResult.reportId}-${summary.metricKey}`}
                          summary={summary}
                          hideSinglePointTrend
                          onClick={() => onOpenDetail(summary)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
});
