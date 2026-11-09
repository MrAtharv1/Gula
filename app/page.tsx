"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  getActiveReports,
  getLatestResults,
  getHistory,
  loadDemoData,
  migrateFromLegacyDatabase,
} from "@/lib/db";
import { Report, ResultWithDate, LatestResultSummary, MetricCategory } from "@/lib/db/schema";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { Navbar, NavTab } from "@/components/Navbar";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { SettingsView } from "@/components/SettingsView";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToastContainer } from "@/components/ui/Toast";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SyncMergeModal } from "@/components/SyncMergeModal";
import { initSyncEngine, syncAll } from "@/lib/sync/syncEngine";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import { Plus, FilePlus, Layers, GitCompare, LineChart as ChartIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Lazy-load heavy chart and modal components for performance and mobile Lighthouse optimization
const BiomarkerTrendChart = dynamic(
  () => import("@/components/BiomarkerTrendChart").then((mod) => mod.BiomarkerTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading trend chart...
      </div>
    ),
  }
);

const MultiMetricTrendChart = dynamic(
  () => import("@/components/MultiMetricTrendChart").then((mod) => mod.MultiMetricTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading comparison chart...
      </div>
    ),
  }
);

const ReportCompareView = dynamic(
  () => import("@/components/ReportCompareView").then((mod) => mod.ReportCompareView),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading report comparison...
      </div>
    ),
  }
);

const MetricDetailModal = dynamic(
  () => import("@/components/MetricDetailModal").then((mod) => mod.MetricDetailModal),
  { ssr: false }
);

const UploadModal = dynamic(
  () => import("@/components/UploadModal").then((mod) => mod.UploadModal),
  { ssr: false }
);

const ManualEntryModal = dynamic(
  () => import("@/components/ManualEntryModal").then((mod) => mod.ManualEntryModal),
  { ssr: false }
);

const CATEGORY_ORDER: MetricCategory[] = [
  "Blood",
  "Lipids",
  "Sugar",
  "Thyroid",
  "Liver",
  "Kidney",
  "Vitamins",
  "Hormones",
  "Other",
];

export type TrendsSubMode = "overlay" | "compare" | "single";

export default function GulaApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [reports, setReports] = useState<Report[]>([]);
  const [summaries, setSummaries] = useState<LatestResultSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("glucose_fasting");
  const [selectedHistory, setSelectedHistory] = useState<ResultWithDate[]>([]);
  const [trendsMode, setTrendsMode] = useState<TrendsSubMode>("overlay");
  const [isLoading, setIsLoading] = useState(true);

  // Metric Detail Modal State
  const [detailSummary, setDetailSummary] = useState<LatestResultSummary | null>(null);
  const [detailHistory, setDetailHistory] = useState<ResultWithDate[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Upload & Manual Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Load all active data from Dexie IndexedDB
  const loadData = useCallback(async () => {
    try {
      await migrateFromLegacyDatabase();
      const activeReports = await getActiveReports();
      setReports(activeReports);

      const latestSummaries = await getLatestResults();
      setSummaries(latestSummaries);

      if (latestSummaries.length > 0) {
        const exists = latestSummaries.some((s) => s.metricKey === selectedKey);
        const targetKey = exists ? selectedKey : latestSummaries[0].metricKey;
        setSelectedKey(targetKey);
        const history = await getHistory(targetKey);
        setSelectedHistory(history);
      } else {
        setSelectedHistory([]);
      }
    } catch (err) {
      console.error("Error loading data from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    loadData();
    const cleanup = initSyncEngine();
    return cleanup;
  }, [loadData]);

  // Open Metric Detail Modal
  const handleOpenDetail = useCallback(async (summary: LatestResultSummary) => {
    setDetailSummary(summary);
    setSelectedKey(summary.metricKey);
    const history = await getHistory(summary.metricKey);
    setDetailHistory(history);
    setIsDetailOpen(true);
  }, []);

  // Summary strip statistics: Total tests, In range, Needs attention
  const stats = useMemo(() => {
    let inRange = 0;
    let needsAttention = 0;

    for (const s of summaries) {
      if (s.latestResult.flag === "normal") {
        inRange++;
      } else {
        needsAttention++;
      }
    }

    return {
      total: summaries.length,
      inRange,
      needsAttention,
    };
  }, [summaries]);

  // Out-of-range metrics for "Needs attention" section
  const needsAttentionSummaries = useMemo(() => {
    return summaries.filter((s) => s.latestResult.flag !== "normal");
  }, [summaries]);

  // Group summaries by category in canonical clinical order
  const categoryGroups = useMemo(() => {
    const map = new Map<MetricCategory, LatestResultSummary[]>();

    for (const s of summaries) {
      const cat = s.category || "Other";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    }

    const groups: { category: MetricCategory; items: LatestResultSummary[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat) && map.get(cat)!.length > 0) {
        groups.push({ category: cat, items: map.get(cat)! });
      }
    }

    // Add any category not explicitly in CATEGORY_ORDER
    for (const [cat, items] of map.entries()) {
      if (!CATEGORY_ORDER.includes(cat) && items.length > 0) {
        groups.push({ category: cat, items });
      }
    }

    return groups;
  }, [summaries]);

  // All historical records map for multi-metric overlay
  const allHistoryMap = useMemo(() => {
    const map: Record<string, ResultWithDate[]> = {};
    for (const s of summaries) {
      if (s.history) {
        map[s.metricKey] = s.history;
      }
    }
    return map;
  }, [summaries]);

  const latestReportDate = reports.length > 0 ? reports[0].reportDate : null;

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] overflow-hidden">
      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Desktop Slim Sidebar & Mobile Bottom Tab Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 md:pb-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {activeTab === "home" && "Your health"}
              {activeTab === "trends" && "Biomarker Trends"}
              {activeTab === "settings" && "Settings"}
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
              {activeTab === "home" && (
                latestReportDate
                  ? `Report from ${formatDate(latestReportDate)}`
                  : "No reports recorded"
              )}
              {activeTab === "trends" && (
                `${summaries.length} tracked biomarkers across ${reports.length} reports`
              )}
              {activeTab === "settings" && (
                "Data management and preferences"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<FilePlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              onClick={() => setIsManualOpen(true)}
              className="hidden sm:inline-flex"
            >
              Manual entry
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsUploadOpen(true)}
            >
              Add report
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
          {/* ================= TAB 1: HOME DASHBOARD ================= */}
          {activeTab === "home" && (
            <ErrorBoundary fallbackTitle="Couldn't load dashboard">
              {isLoading && summaries.length === 0 ? (
                <DashboardSkeleton />
              ) : summaries.length > 0 ? (
                <>
                  {/* Summary Strip: Total tests, In range, Needs attention */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xs">
                    <div>
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] block">
                        {stats.total}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mt-0.5">
                        Total tests
                      </span>
                    </div>
                    <div className="border-l border-[var(--border-subtle)] pl-3 sm:pl-5">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 block">
                        {stats.inRange}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mt-0.5">
                        In range
                      </span>
                    </div>
                    <div className="border-l border-[var(--border-subtle)] pl-3 sm:pl-5">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400 block">
                        {stats.needsAttention}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mt-0.5">
                        Needs attention
                      </span>
                    </div>
                  </div>

                  {/* "Needs attention" Section First: out-of-range metrics only */}
                  {needsAttentionSummaries.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                          Needs attention
                        </h2>
                        <Badge variant="abnormal" size="sm">
                          {needsAttentionSummaries.length}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {needsAttentionSummaries.map((summary) => (
                          <BiomarkerCard
                            key={`attention-${summary.metricKey}`}
                            summary={summary}
                            onClick={() => handleOpenDetail(summary)}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Category Sections: Blood, Lipids, Sugar, Thyroid, Liver, Kidney, Vitamins... */}
                  <div className="space-y-6 sm:space-y-8">
                    {categoryGroups.map(({ category, items }) => (
                      <section key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                            {category}
                          </h3>
                          <span className="text-xs text-[var(--text-muted)]">
                            ({items.length})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {items.map((summary) => (
                            <BiomarkerCard
                              key={summary.metricKey}
                              summary={summary}
                              onClick={() => handleOpenDetail(summary)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                /* Empty state: a calm illustration-free screen */
                <EmptyState
                  title="No reports yet"
                  description="Upload your test report PDF to see your health dashboard. All data is processed and stored locally on your device."
                  actionLabel="Upload report"
                  onAction={() => setIsUploadOpen(true)}
                  secondaryActionLabel="Try demo data"
                  secondaryActionType="link"
                  onSecondaryAction={async () => {
                    await loadDemoData();
                    await loadData();
                    toast("Loaded demo checkup reports", "success");
                  }}
                />
              )}
            </ErrorBoundary>
          )}

          {/* ================= TAB 2: BIOMARKER TRENDS ================= */}
          {activeTab === "trends" && (
            <ErrorBoundary fallbackTitle="Couldn't load trends view">
              <div className="space-y-6">
              {summaries.length > 0 ? (
                <>
                  {/* Sub-Mode Segmented Control: Overlay | Compare | Single Metric */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs">
                      <button
                        onClick={() => setTrendsMode("overlay")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer tap-target select-none",
                          trendsMode === "overlay"
                            ? "bg-[var(--accent)] text-white shadow-xs font-semibold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Overlay (Up to 4)</span>
                      </button>

                      <button
                        onClick={() => setTrendsMode("compare")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer tap-target select-none",
                          trendsMode === "compare"
                            ? "bg-[var(--accent)] text-white shadow-xs font-semibold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Compare 2 Reports</span>
                      </button>

                      <button
                        onClick={() => setTrendsMode("single")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer tap-target select-none",
                          trendsMode === "single"
                            ? "bg-[var(--accent)] text-white shadow-xs font-semibold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <ChartIcon className="w-3.5 h-3.5" />
                        <span>Single Metric</span>
                      </button>
                    </div>

                    <span className="text-xs text-[var(--text-muted)]">
                      {reports.length} {reports.length === 1 ? "report" : "reports"} on file
                    </span>
                  </div>

                  {/* Mode 1: Multi-Metric Overlay (Up to 4 metrics) */}
                  {trendsMode === "overlay" && (
                    <MultiMetricTrendChart
                      summaries={summaries}
                      allHistory={allHistoryMap}
                    />
                  )}

                  {/* Mode 2: Compare 2 Reports Side by Side */}
                  {trendsMode === "compare" && (
                    <ReportCompareView reports={reports} />
                  )}

                  {/* Mode 3: Single Metric Explorer with Large Chart */}
                  {trendsMode === "single" && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          Select Biomarker:
                        </label>
                        <select
                          value={selectedKey}
                          onChange={async (e) => {
                            const key = e.target.value;
                            setSelectedKey(key);
                            const history = await getHistory(key);
                            setSelectedHistory(history);
                          }}
                          className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden cursor-pointer"
                        >
                          {summaries.map((s) => (
                            <option key={s.metricKey} value={s.metricKey}>
                              {s.displayName} ({s.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const currentSummary = summaries.find((s) => s.metricKey === selectedKey);
                        const currentDef = METRIC_DICTIONARY[selectedKey];
                        return (
                          <BiomarkerTrendChart
                            history={selectedHistory}
                            biomarkerName={currentSummary?.displayName || currentDef?.displayName || selectedKey}
                            unit={currentSummary?.latestResult.unit || currentDef?.standardUnit || ""}
                            refLow={currentSummary?.latestResult.refLow ?? currentDef?.defaultLow}
                            refHigh={currentSummary?.latestResult.refHigh ?? currentDef?.defaultHigh}
                            description={currentDef?.description}
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* All Tracked Biomarkers Grid */}
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      All Tracked Biomarkers ({summaries.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {summaries.map((s) => (
                        <BiomarkerCard
                          key={s.metricKey}
                          summary={s}
                          isSelected={s.metricKey === selectedKey}
                          onClick={() => handleOpenDetail(s)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No biomarkers to display"
                  description="Upload a report or load demo checkup data to view interactive trend lines."
                  actionLabel="Upload report"
                  onAction={() => setIsUploadOpen(true)}
                  secondaryActionLabel="Try demo data"
                  secondaryActionType="link"
                  onSecondaryAction={async () => {
                    await loadDemoData();
                    await loadData();
                    toast("Loaded demo checkup reports", "success");
                  }}
                />
              )}
            </div>
            </ErrorBoundary>
          )}

          {/* ================= TAB 3: SETTINGS ================= */}
          {activeTab === "settings" && (
            <SettingsView
              onDataChanged={() => {
                loadData();
                toast("Data updated", "info");
              }}
            />
          )}
        </div>
      </main>

      {/* Metric Detail Modal / Sheet */}
      <MetricDetailModal
        summary={detailSummary}
        history={detailHistory}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Upload Modal (instant refresh on success, then background sync) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab("home");
          syncAll().catch((err) => console.error("Post-upload sync error:", err));
        }}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab("home");
          toast("Entry saved successfully", "success");
          syncAll().catch((err) => console.error("Post-entry sync error:", err));
        }}
      />

      {/* First Sign-In Merge Confirmation Modal */}
      <SyncMergeModal onComplete={() => loadData()} />
    </div>
  );
}
