"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PageContainer } from "@/components/ui/PageContainer";
import { SingleMetricTrendsView } from "@/components/SingleMetricTrendsView";
import { initSyncEngine, syncAll } from "@/lib/sync/syncEngine";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import { Plus, Upload, FilePlus, Layers, GitCompare, LineChart as ChartIcon, CheckCircle2, ChevronDown } from "lucide-react";
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

export type TrendsSubMode = "single" | "compare" | "overlay";

export default function GulaApp() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [reports, setReports] = useState<Report[]>([]);
  const [summaries, setSummaries] = useState<LatestResultSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("glucose_fasting");
  const [selectedHistory, setSelectedHistory] = useState<ResultWithDate[]>([]);
  const [trendsMode, setTrendsMode] = useState<TrendsSubMode>("single");
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

  // ── Add report dropdown state ──────────────────────────────
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Sticky header scroll-border ────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 2);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // ── Trends sub-mode segmented options ──────────────────────
  const trendsOptions = [
    { value: "single" as TrendsSubMode, label: "Single metric", icon: <ChartIcon className="w-3.5 h-3.5" /> },
    { value: "compare" as TrendsSubMode, label: "Compare", icon: <GitCompare className="w-3.5 h-3.5" /> },
    { value: "overlay" as TrendsSubMode, label: "Overlay", icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] overflow-hidden">
      {/* Toast */}
      <ToastContainer />

      {/* Sidebar + mobile bottom tab bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main scroll area */}
      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-8">

        {/* ── Sticky top header ──────────────────────────────── */}
        <header
          className={cn(
            "sticky top-0 z-30",
            "transition-all duration-[150ms] ease-out",
            scrolled
              ? "bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              : "bg-transparent border-b border-transparent"
          )}
        >
          <PageContainer className="flex items-center justify-between py-3.5 gap-4">
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                {activeTab === "home" && "Health overview"}
                {activeTab === "trends" && "Trends"}
                {activeTab === "settings" && "Settings"}
              </h1>
              <p className="text-[11.5px] text-[var(--text-faint)] leading-snug mt-0.5">
                {activeTab === "home" && (
                  latestReportDate
                    ? `Last report · ${formatDate(latestReportDate)}`
                    : "No reports yet"
                )}
                {activeTab === "trends" && (
                  `${summaries.length} markers · ${reports.length} ${reports.length === 1 ? "report" : "reports"}`
                )}
                {activeTab === "settings" && "Data & preferences"}
              </p>
            </div>

            {/* ONE primary action: "Add report" with dropdown */}
            {activeTab !== "settings" && (
              <div ref={addMenuRef} className="relative shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAddMenuOpen((o) => !o)}
                  className="gap-1.5"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Add</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-[100ms]", addMenuOpen && "rotate-180")} />
                </Button>

                {/* Dropdown menu */}
                {addMenuOpen && (
                  <div
                    className={cn(
                      "absolute right-0 top-full mt-1.5 z-50",
                      "min-w-[158px] rounded-xl p-1",
                      "bg-[var(--bg-card)] border border-[var(--border-strong)]",
                      "shadow-[var(--shadow-lg)]",
                      "animate-in fade-in zoom-in-95 duration-[100ms]"
                    )}
                  >
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg",
                        "text-[12.5px] text-[var(--text-primary)] font-medium tracking-tight",
                        "hover:bg-[var(--bg-hover)] transition-colors duration-[80ms]",
                        "cursor-pointer select-none text-left",
                      )}
                      onClick={() => { setAddMenuOpen(false); setIsUploadOpen(true); }}
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                      Upload PDF
                    </button>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg",
                        "text-[12.5px] text-[var(--text-primary)] font-medium tracking-tight",
                        "hover:bg-[var(--bg-hover)] transition-colors duration-[80ms]",
                        "cursor-pointer select-none text-left",
                      )}
                      onClick={() => { setAddMenuOpen(false); setIsManualOpen(true); }}
                    >
                      <FilePlus className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                      Enter manually
                    </button>
                  </div>
                )}
              </div>
            )}
          </PageContainer>
        </header>

        {/* ── Page content ───────────────────────────────────── */}
        <PageContainer className="py-5 space-y-7">

          {/* ═════ TAB 1: HOME ═════ */}
          {activeTab === "home" && (
            <ErrorBoundary fallbackTitle="Couldn't load dashboard">
              {isLoading && summaries.length === 0 ? (
                <DashboardSkeleton />
              ) : summaries.length > 0 ? (
                <div className="space-y-7 animate-fade-up">
                  {/* Summary strip */}
                  <div className="grid grid-cols-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden">
                    <div className="flex flex-col px-4 sm:px-5 py-4 gap-1">
                      <span className="text-[26px] font-semibold leading-none tabular-nums tracking-tight text-[var(--text-primary)]">
                        {stats.total}
                      </span>
                      <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                        Markers
                      </span>
                    </div>
                    <div className="flex flex-col px-4 sm:px-5 py-4 gap-1 border-l border-[var(--border-subtle)]">
                      <span className="text-[26px] font-semibold leading-none tabular-nums tracking-tight text-[var(--status-normal-text)]">
                        {stats.inRange}
                      </span>
                      <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                        In range
                      </span>
                    </div>
                    <div className="flex flex-col px-4 sm:px-5 py-4 gap-1 border-l border-[var(--border-subtle)]">
                      {stats.needsAttention === 0 ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[var(--status-normal-dot)] shrink-0" />
                            <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">All good</span>
                          </span>
                          <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                            All in range
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="text-[26px] font-semibold leading-none tabular-nums tracking-tight"
                            style={{ color: stats.needsAttention > 2 ? "var(--status-abnormal-text)" : "var(--status-borderline-text)" }}
                          >
                            {stats.needsAttention}
                          </span>
                          <span className="text-[11.5px] text-[var(--text-faint)] leading-tight">
                            Need attention
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Needs attention */}
                  {needsAttentionSummaries.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                          Needs attention
                        </h2>
                        <span className="text-[11.5px] text-[var(--text-faint)] tabular-nums">
                          {needsAttentionSummaries.length}
                        </span>
                      </div>
                      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] auto-rows-fr">
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

                  {/* Category sections */}
                  <div className="space-y-7">
                    {categoryGroups.map(({ category, items }) => (
                      <section key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                            {category}
                          </h3>
                          <span className="text-[11.5px] text-[var(--text-faint)] tabular-nums">
                            {items.length}
                          </span>
                        </div>
                        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] auto-rows-fr">
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
                </div>
              ) : (
                <EmptyState
                  title="No reports yet"
                  description="Upload a lab report PDF to start tracking your health."
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

          {/* ═════ TAB 2: TRENDS ═════ */}
          {activeTab === "trends" && (
            <ErrorBoundary fallbackTitle="Couldn't load trends view">
              <div className="space-y-6">
                {summaries.length > 0 ? (
                  <>
                    {/* Shared segmented control — Overlay / Compare / Single */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <SegmentedControl
                        options={trendsOptions}
                        value={trendsMode}
                        onChange={setTrendsMode}
                      />
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {reports.length} {reports.length === 1 ? "report" : "reports"} on file
                      </span>
                    </div>

                    {trendsMode === "single" && (
                      <SingleMetricTrendsView
                        summaries={summaries}
                        reports={reports}
                        onOpenDetail={handleOpenDetail}
                      />
                    )}

                    {trendsMode === "compare" && (
                      <ReportCompareView reports={reports} />
                    )}

                    {trendsMode === "overlay" && (
                      <MultiMetricTrendChart
                        summaries={summaries}
                        allHistory={allHistoryMap}
                      />
                    )}

                    {/* All tracked biomarkers in compare and overlay modes */}
                    {trendsMode !== "single" && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                            All metrics
                          </h3>
                          <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                            {summaries.length}
                          </span>
                        </div>
                        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))] auto-rows-fr">
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
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="No data yet"
                    description="Upload a report to view trends."
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

          {/* ═════ TAB 3: SETTINGS ═════ */}
          {activeTab === "settings" && (
            <SettingsView
              onDataChanged={() => {
                loadData();
                toast("Data updated", "info");
              }}
            />
          )}
        </PageContainer>
      </main>

      {/* Modals */}
      <MetricDetailModal
        summary={detailSummary}
        history={detailHistory}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab("home");
          syncAll().catch((err) => console.error("Post-upload sync error:", err));
        }}
      />

      <ManualEntryModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab("home");
          toast("Entry saved", "success");
          syncAll().catch((err) => console.error("Post-entry sync error:", err));
        }}
      />

      <SyncMergeModal onComplete={() => loadData()} />
    </div>
  );
}
