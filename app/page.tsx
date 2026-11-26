"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  getDashboardData,
  loadDemoData,
  migrateFromLegacyDatabase,
  hasReachedGuestReportLimit,
} from "@/lib/db";
import { useSyncStore } from "@/lib/store/syncStore";
import { usePreferenceStore } from "@/lib/store/preferenceStore";
import { exportDoctorReportPdf } from "@/lib/utils/doctorPdfExport";
import { Report, ResultWithDate, LatestResultSummary } from "@/lib/db/schema";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { HomeDashboardView, HomeFilterType } from "@/components/HomeDashboardView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToastContainer } from "@/components/ui/Toast";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SyncMergeModal } from "@/components/SyncMergeModal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PageContainer } from "@/components/ui/PageContainer";
import { Navbar, NavTab } from "@/components/Navbar";
import {
  buildReportScopedSummaries,
  cleanReportFileName,
  getReportButtonLabel,
} from "@/lib/utils/reportView";
import { initSyncEngine, syncAll } from "@/lib/sync/syncEngine";
import { useTranslation } from "@/lib/i18n/translations";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import {
  Plus,
  Upload,
  FilePlus,
  Layers,
  GitCompare,
  LineChart as ChartIcon,
  ChevronDown,
  FileText,
  Check,
  FileDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Lazy-load secondary tabs and heavy chart/modal components for fast TTI
const SingleMetricTrendsView = dynamic(
  () => import("@/components/SingleMetricTrendsView").then((mod) => mod.SingleMetricTrendsView),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading markers...
      </div>
    ),
  }
);

const SettingsView = dynamic(
  () => import("@/components/SettingsView").then((mod) => mod.SettingsView),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading settings...
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

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((mod) => mod.AuthModal),
  { ssr: false }
);

export type TrendsSubMode = "single" | "compare" | "overlay";

export default function GulaApp() {
  const { t } = useTranslation();
  const { user } = useSyncStore();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [reports, setReports] = useState<Report[]>([]);
  const [summaries, setSummaries] = useState<LatestResultSummary[]>([]);
  const [resultsByReportId, setResultsByReportId] = useState<Record<number, ResultWithDate[]>>({});
  const [allHistoryByMetric, setAllHistoryByMetric] = useState<Record<string, ResultWithDate[]>>({});
  const [selectedKey, setSelectedKey] = useState<string>("glucose_fasting");
  const [trendsMode, setTrendsMode] = useState<TrendsSubMode>("single");
  const [isLoading, setIsLoading] = useState(true);

  // Persisted session-only Homepage state (kept across tabs & card clicks; resets on close/hard refresh)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [homeFilters, setHomeFilters] = useState<Set<HomeFilterType>>(new Set(["all"]));
  const [collapsedHomePanels, setCollapsedHomePanels] = useState<Set<string>>(new Set());

  // Metric Detail Modal State
  const [detailSummary, setDetailSummary] = useState<LatestResultSummary | null>(null);
  const [detailHistory, setDetailHistory] = useState<ResultWithDate[]>([]);
  const [detailIsLatestReport, setDetailIsLatestReport] = useState<boolean>(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Upload, Manual & Auth Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authLimitReason, setAuthLimitReason] = useState(false);

  // Single-pass load from Dexie IndexedDB — independent of selectedKey so clicking cards never reloads DB
  const loadData = useCallback(async () => {
    try {
      await migrateFromLegacyDatabase();
      const data = await getDashboardData();
      setReports(data.reports);
      setSummaries(data.allSummaries);
      setResultsByReportId(data.resultsByReportId);
      setAllHistoryByMetric(data.allHistoryByMetric);

      if (data.allSummaries.length > 0) {
        setSelectedKey((prev) =>
          data.allSummaries.some((s) => s.metricKey === prev)
            ? prev
            : data.allSummaries[0].metricKey
        );
      }

      // Reset selectedReportId only if that report was undone/deleted
      setSelectedReportId((prev) => {
        if (prev === null) return null;
        return data.reports.some((r) => r.id === prev) ? prev : null;
      });
    } catch (err) {
      console.error("Error loading data from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const cleanup = initSyncEngine();
    return cleanup;
  }, [loadData]);

  // Active report selected on Homepage (defaults to latest report)
  const selectedReport = useMemo(() => {
    if (reports.length === 0) return null;
    if (selectedReportId !== null) {
      const found = reports.find((r) => r.id === selectedReportId);
      if (found) return found;
    }
    return reports[0];
  }, [reports, selectedReportId]);

  const isSelectedLatest = Boolean(
    selectedReport && reports.length > 0 && selectedReport.id === reports[0].id
  );

  // Scoped cards for the selected Homepage report (0ms in-memory derivation)
  const homeSummaries = useMemo(() => {
    if (!selectedReport) return [];
    return buildReportScopedSummaries(
      selectedReport,
      reports,
      resultsByReportId,
      allHistoryByMetric
    );
  }, [selectedReport, reports, resultsByReportId, allHistoryByMetric]);

  // Open Metric Detail Modal instantaneously from cached history
  const handleOpenDetail = useCallback(
    (summary: LatestResultSummary, fromHome = false) => {
      setDetailSummary(summary);
      setSelectedKey(summary.metricKey);
      setDetailIsLatestReport(fromHome ? isSelectedLatest : true);
      setDetailHistory(
        summary.history ||
          allHistoryByMetric[summary.metricKey] ||
          [summary.latestResult]
      );
      setIsDetailOpen(true);
    },
    [allHistoryByMetric, isSelectedLatest]
  );

  // Homepage filter checkboxes (All, Out of range, Within range)
  const handleToggleHomeFilter = useCallback((filter: HomeFilterType) => {
    setHomeFilters((prev) => {
      if (filter === "all") return new Set(["all"]);
      const next = new Set(prev);
      next.delete("all");
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      if (next.size === 0 || next.size === 2) {
        return new Set(["all"]);
      }
      return next;
    });
  }, []);

  // Homepage accordion panel toggle
  const handleToggleHomePanel = useCallback((panelName: string) => {
    setCollapsedHomePanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelName)) {
        next.delete(panelName);
      } else {
        next.add(panelName);
      }
      return next;
    });
  }, []);

  // ── Header menus: Report Selector & Add Report ─────────────
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) {
        setReportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddMenuOpen(false);
        setReportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ── Sticky header scroll-border ────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 2);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // ── Trends sub-mode segmented options ──────────────────────
  const trendsOptions = useMemo(
    () => [
      { value: "single" as TrendsSubMode, label: t.singleMetric, icon: <ChartIcon className="w-3.5 h-3.5" /> },
      { value: "compare" as TrendsSubMode, label: t.compare, icon: <GitCompare className="w-3.5 h-3.5" /> },
      { value: "overlay" as TrendsSubMode, label: t.overlay, icon: <Layers className="w-3.5 h-3.5" /> },
    ],
    [t.singleMetric, t.compare, t.overlay]
  );

  // Guard report creation for unsigned guests (max 2 reports without an account)
  const openUploadWithGuard = useCallback(() => {
    if (hasReachedGuestReportLimit(reports.length, Boolean(user))) {
      setAuthLimitReason(true);
      setIsAuthOpen(true);
      return;
    }
    setIsUploadOpen(true);
  }, [reports.length, user]);

  const openManualWithGuard = useCallback(() => {
    if (hasReachedGuestReportLimit(reports.length, Boolean(user))) {
      setAuthLimitReason(true);
      setIsAuthOpen(true);
      return;
    }
    setIsManualOpen(true);
  }, [reports.length, user]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const profile = usePreferenceStore((s) => s.profile);

  const handleExportHomePdf = useCallback(async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { fileName } = await exportDoctorReportPdf({
        profile,
        accountEmail: user?.email,
      });
      toast(`Downloaded ${fileName}`, "success");
    } catch (err: any) {
      console.error(err);
      toast(err?.message || "Couldn't generate PDF report.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  }, [isExportingPdf, profile, user?.email]);

  return (
    <div className="flex h-screen bg-[var(--bg-secondary)] overflow-hidden">
      {/* Toast */}
      <ToastContainer />

      {/* Sidebar + mobile bottom tab bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={openUploadWithGuard}
        onOpenAuth={() => {
          setAuthLimitReason(false);
          setIsAuthOpen(true);
        }}
        markersCount={summaries.length}
        reportsCount={reports.length}
      />

      {/* Main scroll area */}
      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-8 dark-ambient-bg">

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
          <PageContainer className="flex items-center justify-between py-3.5 gap-3">
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                {activeTab === "home" && t.healthOverview}
                {activeTab === "trends" && t.trends}
                {activeTab === "settings" && t.settings}
              </h1>
              <p className="text-[11.5px] text-[var(--text-faint)] leading-snug mt-0.5 truncate">
                {activeTab === "home" && (
                  selectedReport
                    ? `${isSelectedLatest ? t.latestReport : cleanReportFileName(selectedReport.fileName)} · ${formatDate(selectedReport.reportDate)}`
                    : t.noReportsYet
                )}
                {activeTab === "trends" && (
                  `${summaries.length} ${summaries.length === 1 ? t.markerSingular : t.markerPlural} · ${reports.length} ${reports.length === 1 ? t.reportSingular : t.reportPlural}`
                )}
                {activeTab === "settings" && t.dataAndPreferences}
              </p>
            </div>

            {/* Header actions */}
            {activeTab !== "settings" && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Export PDF Button (left of Latest report on Home) */}
                {activeTab === "home" && selectedReport && summaries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportHomePdf}
                    disabled={isExportingPdf}
                    title="Export physician-readable PDF report"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg",
                      "bg-[#EC4899] hover:bg-[#DB2777] text-white",
                      "text-[12px] font-medium shadow-[var(--shadow-sm)]",
                      "transition-colors duration-[100ms] cursor-pointer select-none disabled:opacity-50",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC4899]"
                    )}
                  >
                    <img
                      src="/logo.png"
                      alt=""
                      aria-hidden="true"
                      className="w-4 h-4 object-contain shrink-0 rounded-full bg-white p-px"
                    />
                    <span className="hidden sm:inline">
                      {isExportingPdf ? "Exporting..." : "Export pdf"}
                    </span>
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                )}

                {/* Report Switcher Button (left of Add button on Home) */}
                {activeTab === "home" && selectedReport && (
                  <div ref={reportMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setReportMenuOpen((o) => !o)}
                      aria-haspopup="listbox"
                      aria-expanded={reportMenuOpen}
                      aria-label={`Select report, currently ${getReportButtonLabel(selectedReport, isSelectedLatest)} from ${formatDate(selectedReport.reportDate)}`}
                      className={cn(
                        "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg",
                        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                        "hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-subtle)]/60",
                        "shadow-[var(--shadow-sm)] transition-all duration-[100ms] ease-out",
                        "cursor-pointer select-none",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                      <span className="flex flex-col items-start text-left min-w-0">
                        <span className="text-[11.5px] font-medium text-[var(--text-primary)] leading-tight truncate max-w-[110px] sm:max-w-[150px]">
                          {getReportButtonLabel(selectedReport, isSelectedLatest)}
                        </span>
                        <span className="text-[10px] text-[var(--text-faint)] tabular-nums leading-tight mt-0.5">
                          {formatDate(selectedReport.reportDate)}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-[var(--text-faint)] shrink-0 transition-transform duration-[100ms]",
                          reportMenuOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {reportMenuOpen && (
                      <div
                        role="listbox"
                        aria-label="Uploaded reports"
                        className={cn(
                          "absolute right-0 top-full mt-1.5 z-50",
                          "min-w-[230px] max-w-[290px] max-h-[320px] overflow-y-auto rounded-xl p-1",
                          "bg-[var(--bg-card)] border border-[var(--border-strong)]",
                          "shadow-[var(--shadow-lg)]",
                          "animate-in fade-in zoom-in-95 duration-[100ms]"
                        )}
                      >
                        <div className="px-2.5 py-1.5 text-[10.5px] font-medium text-[var(--text-faint)] uppercase tracking-wider">
                          {t.switchReport}
                        </div>
                        {reports.map((rep, idx) => {
                          const isCurrent = rep.id === selectedReport.id;
                          const isLatest = idx === 0;
                          const markerCount = rep.id != null ? (resultsByReportId[rep.id]?.length ?? 0) : 0;
                          const label = isLatest
                            ? t.latestReport
                            : rep.labName?.trim() || cleanReportFileName(rep.fileName);

                          return (
                            <button
                              key={rep.id ?? idx}
                              type="button"
                              role="option"
                              aria-selected={isCurrent}
                              onClick={() => {
                                setSelectedReportId(isLatest ? null : (rep.id ?? null));
                                setReportMenuOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left",
                                "transition-colors duration-[80ms] cursor-pointer select-none",
                                isCurrent
                                  ? "bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                                  : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12.5px] font-medium truncate">
                                    {label}
                                  </span>
                                  {isLatest && (
                                    <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--accent)] shrink-0">
                                      {t.latestReport}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--text-faint)] tabular-nums mt-0.5">
                                  {formatDate(rep.reportDate)} · {markerCount} {markerCount === 1 ? t.markerSingular : t.markerPlural}
                                </div>
                              </div>
                              {isCurrent && (
                                <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Primary action: Add */}
                <div ref={addMenuRef} className="relative">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAddMenuOpen((o) => !o)}
                    className="gap-1.5 h-9"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{t.add}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-[100ms]", addMenuOpen && "rotate-180")} />
                  </Button>

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
                        onClick={() => { setAddMenuOpen(false); openUploadWithGuard(); }}
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        {t.uploadPdf}
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg",
                          "text-[12.5px] text-[var(--text-primary)] font-medium tracking-tight",
                          "hover:bg-[var(--bg-hover)] transition-colors duration-[80ms]",
                          "cursor-pointer select-none text-left",
                        )}
                        onClick={() => { setAddMenuOpen(false); openManualWithGuard(); }}
                      >
                        <FilePlus className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        {t.enterManually}
                      </button>
                    </div>
                  )}
                </div>
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
              ) : selectedReport ? (
                <HomeDashboardView
                  summaries={homeSummaries}
                  selectedFilters={homeFilters}
                  onToggleFilter={handleToggleHomeFilter}
                  collapsedPanels={collapsedHomePanels}
                  onTogglePanel={handleToggleHomePanel}
                  onOpenDetail={(s) => handleOpenDetail(s, true)}
                />
              ) : (
                <EmptyState
                  title="No reports yet"
                  description="Upload a lab report PDF to start tracking your health."
                  actionLabel="Upload report"
                  onAction={openUploadWithGuard}
                  secondaryActionLabel="Try demo data"
                  secondaryActionType="link"
                  onSecondaryAction={async () => {
                    await loadDemoData();
                    setSelectedReportId(null);
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
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <SegmentedControl
                        options={trendsOptions}
                        value={trendsMode}
                        onChange={setTrendsMode}
                      />
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {reports.length} {reports.length === 1 ? t.reportSingular : t.reportPlural} {t.reportsOnFile}
                      </span>
                    </div>

                    {trendsMode === "single" && (
                      <SingleMetricTrendsView
                        summaries={summaries}
                        reports={reports}
                        onOpenDetail={(s) => handleOpenDetail(s, false)}
                      />
                    )}

                    {trendsMode === "compare" && (
                      <ReportCompareView reports={reports} />
                    )}

                    {trendsMode === "overlay" && (
                      <MultiMetricTrendChart
                        summaries={summaries}
                        allHistory={allHistoryByMetric}
                      />
                    )}

                    {trendsMode !== "single" && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                            {t.allMetrics}
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
                              onClick={() => handleOpenDetail(s, false)}
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
                    onAction={openUploadWithGuard}
                    secondaryActionLabel="Try demo data"
                    secondaryActionType="link"
                    onSecondaryAction={async () => {
                      await loadDemoData();
                      setSelectedReportId(null);
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
              onOpenAuth={() => {
                setAuthLimitReason(false);
                setIsAuthOpen(true);
              }}
            />
          )}

          {/* Semantic About / SEO Footer explaining Gula + Biomarker Guides */}
          <footer
            aria-label="About Gula"
            className="pt-6 mt-4 border-t border-[var(--border-subtle)] text-[11.5px] text-[var(--text-faint)] leading-relaxed space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="max-w-3xl space-y-1.5">
                <h2 className="text-[12.5px] font-semibold text-[var(--text-muted)]">
                  Understand Your Blood Test Report &amp; Track Every Result Over Time
                </h2>
                <p>
                  <strong className="font-medium text-[var(--text-muted)]">Gula</strong>{" "}
                  (from <em>&ldquo;gula&rdquo;</em>, meaning sugar) turns diagnostic PDFs into clear biomarker dashboards, normal-range status checks, plain-language test explanations in 12 languages, and report-over-report comparisons for HbA1c, fasting glucose, lipid profile (LDL, HDL, triglycerides), liver function (SGOT/AST, SGPT/ALT, bilirubin), kidney (creatinine, eGFR), thyroid (TSH, T3, T4), and CBC panels.
                </p>
                <p>
                  Try up to 2 reports free as a guest or sign in with Google or email for encrypted cloud sync. Your records are encrypted in transit and at rest, never sold or used for ads. For educational tracking only &mdash; consult a qualified doctor for medical advice.
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-[var(--text-faint)] pt-0.5">
                GULA : Your Privacy Matters
              </span>
            </div>

            {/* Crawl & Reader Links to Static Biomarker Guides */}
            <nav aria-label="Biomarker normal range guides" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
              <Link
                href="/markers"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                All Blood Test Guides &rarr;
              </Link>
              <Link href="/markers/hba1c" className="hover:text-[var(--text-secondary)] transition-colors">
                HbA1c Normal Range
              </Link>
              <Link href="/markers/glucose_fasting" className="hover:text-[var(--text-secondary)] transition-colors">
                Fasting Glucose
              </Link>
              <Link href="/markers/cholesterol_total" className="hover:text-[var(--text-secondary)] transition-colors">
                Cholesterol &amp; Lipids
              </Link>
              <Link href="/markers/ldl" className="hover:text-[var(--text-secondary)] transition-colors">
                LDL Guide
              </Link>
              <Link href="/markers/alt" className="hover:text-[var(--text-secondary)] transition-colors">
                SGPT (ALT)
              </Link>
              <Link href="/markers/tsh" className="hover:text-[var(--text-secondary)] transition-colors">
                TSH Thyroid
              </Link>
              <Link href="/markers/creatinine" className="hover:text-[var(--text-secondary)] transition-colors">
                Creatinine (KFT)
              </Link>
              <Link href="/markers/hemoglobin" className="hover:text-[var(--text-secondary)] transition-colors">
                Hemoglobin (CBC)
              </Link>
            </nav>

            {/* Compact FAQ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 px-3 py-2">
                <summary className="cursor-pointer font-medium text-[var(--text-muted)] text-[11.5px]">
                  How do I read a blood test report?
                </summary>
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)] leading-relaxed">
                  Upload your lab PDF to group results by panel, spot high or low flags at a glance, and click any marker for a simple everyday explanation.
                </p>
              </details>
              <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 px-3 py-2">
                <summary className="cursor-pointer font-medium text-[var(--text-muted)] text-[11.5px]">
                  Can I compare two blood reports?
                </summary>
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)] leading-relaxed">
                  Yes. Open Trends &rarr; Compare to view two lab reports side-by-side, or switch reports from the Home header to see changes over time.
                </p>
              </details>
              <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 px-3 py-2">
                <summary className="cursor-pointer font-medium text-[var(--text-muted)] text-[11.5px]">
                  What does Gula mean?
                </summary>
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)] leading-relaxed">
                  Gula means sugar &mdash; bringing simple, sweet clarity to blood sugar, HbA1c, cholesterol, liver, thyroid, and kidney tracking.
                </p>
              </details>
            </div>
          </footer>
        </PageContainer>
      </main>

      {/* Modals */}
      <MetricDetailModal
        summary={detailSummary}
        history={detailHistory}
        isLatestReport={detailIsLatestReport}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onRequireAuth={() => {
          setAuthLimitReason(true);
          setIsAuthOpen(true);
        }}
        onSuccess={() => {
          setSelectedReportId(null);
          loadData();
          setActiveTab("home");
          syncAll().catch((err) => console.error("Post-upload sync error:", err));
        }}
      />

      <ManualEntryModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onRequireAuth={() => {
          setAuthLimitReason(true);
          setIsAuthOpen(true);
        }}
        onSuccess={() => {
          setSelectedReportId(null);
          loadData();
          setActiveTab("home");
          toast("Entry saved", "success");
          syncAll().catch((err) => console.error("Post-entry sync error:", err));
        }}
      />

      <SyncMergeModal onComplete={() => loadData()} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthLimitReason(false);
        }}
        onSyncComplete={() => loadData()}
        limitReason={authLimitReason}
      />
    </div>
  );
}
