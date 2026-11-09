"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Report } from "@/lib/db/schema";
import {
  db,
  getActiveReports,
  getUndoneReports,
  undoLastUpload,
  restoreUndone,
  restoreReport,
  deleteReportPermanently,
  deleteAllData,
  exportAllDataAsJson,
  exportAllDataAsCsv,
  getResultsCountByReport,
} from "@/lib/db";
import { usePreferenceStore } from "@/lib/store/preferenceStore";
import { useSyncStore } from "@/lib/store/syncStore";
import {
  signInWithMagicLink,
  signInWithGoogle,
  signOut,
} from "@/lib/sync/supabaseClient";
import {
  syncAll,
  getLazyPdfBlob,
  deleteAccountAndCloudData,
} from "@/lib/sync/syncEngine";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";
import { PdfPreview } from "./PdfPreview";
import {
  Undo2,
  RotateCcw,
  Trash2,
  Download,
  FileText,
  Eye,
  Calendar,
  Layers,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mail,
  LogOut,
  Loader2,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import { useThemeStore } from "@/lib/store/themeStore";
import { cn } from "@/lib/utils/cn";

interface SettingsViewProps {
  onDataChanged: () => void;
}

export function SettingsView({ onDataChanged }: SettingsViewProps) {
  const { theme, setTheme } = useThemeStore();
  const {
    glucoseUnit,
    cholesterolUnit,
    setGlucoseUnit,
    setCholesterolUnit,
  } = usePreferenceStore();

  const [activeReports, setActiveReports] = useState<Report[]>([]);
  const [undoneReports, setUndoneReports] = useState<Report[]>([]);
  const [resultsCountMap, setResultsCountMap] = useState<Record<number, number>>({});
  const [showUndoneSection, setShowUndoneSection] = useState(false);

  // Modals
  const [isUndoConfirmOpen, setIsUndoConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [pdfViewReport, setPdfViewReport] = useState<Report | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [reportToRemove, setReportToRemove] = useState<Report | null>(null);

  // Phase 8 Sync & Auth State
  const { user, syncStatus, lastSyncedAt } = useSyncStore();
  const [authEmail, setAuthEmail] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // Load reports and results counts
  const loadReports = useCallback(async () => {
    try {
      const active = await getActiveReports();
      const undone = await getUndoneReports();
      const counts = await getResultsCountByReport();
      setActiveReports(active);
      setUndoneReports(undone);
      setResultsCountMap(counts);
    } catch (err) {
      console.error("Failed to load reports in Settings:", err);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Undo Last Upload
  const handleConfirmUndo = async () => {
    try {
      setIsUndoConfirmOpen(false);
      const undone = await undoLastUpload();
      if (undone) {
        await loadReports();
        onDataChanged();

        toast("Undone.", "info", {
          action: {
            label: "Restore",
            onClick: async () => {
              const restored = await restoreUndone();
              if (restored) {
                await loadReports();
                onDataChanged();
                toast("Restored report.", "success");
              }
            },
          },
        });
      } else {
        toast("No active report to undo.", "info");
      }
    } catch (err) {
      console.error(err);
      toast("Undo failed.", "error");
    }
  };

  // Handle Restore Specific Report
  const handleRestoreSpecific = async (reportId: number) => {
    try {
      const success = await restoreReport(reportId);
      if (success) {
        await loadReports();
        onDataChanged();
        toast("Report restored.", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Restore failed.", "error");
    }
  };

  // Handle Delete Report Permanently
  const handleDeletePermanently = async (reportId: number) => {
    try {
      await deleteReportPermanently(reportId);
      await loadReports();
      onDataChanged();
      toast("Report permanently deleted.", "info");
      setReportToRemove(null);
    } catch (err) {
      console.error(err);
      toast("Couldn't delete report.", "error");
    }
  };

  // Handle View PDF (lazily loads from cloud storage if needed)
  const handleViewPdf = async (report: Report) => {
    try {
      const blob = await getLazyPdfBlob(report);
      if (!blob) {
        toast("No PDF file attached to this report.", "error");
        return;
      }
      const buffer = await blob.arrayBuffer();
      setPdfBuffer(buffer);
      setPdfViewReport(report);
    } catch (err) {
      console.error(err);
      toast("Couldn't open PDF preview.", "error");
    }
  };

  // Handle Export Data
  const handleExportJson = async () => {
    try {
      const jsonStr = await exportAllDataAsJson();
      downloadFile(jsonStr, `gula-export-${new Date().toISOString().split("T")[0]}.json`, "application/json");
      toast("Exported data as JSON.", "success");
    } catch (err) {
      console.error(err);
      toast("JSON export failed.", "error");
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = await exportAllDataAsCsv();
      downloadFile(csvStr, `gula-biomarkers-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
      toast("Exported data as CSV.", "success");
    } catch (err) {
      console.error(err);
      toast("CSV export failed.", "error");
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Delete All Data
  const handleConfirmDeleteAll = async () => {
    try {
      setIsDeleteAllConfirmOpen(false);
      await deleteAllData();
      await loadReports();
      onDataChanged();
      toast("All health records have been permanently deleted.", "info");
    } catch (err) {
      console.error(err);
      toast("Failed to delete all data.", "error");
    }
  };

  // Auth & Sync handlers
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setIsAuthBusy(true);
    try {
      const { error } = await signInWithMagicLink(authEmail.trim());
      if (error) {
        toast(error.message, "error");
      } else {
        toast("Check your email for the magic sign-in link.", "success");
        setAuthEmail("");
      }
    } catch (err: any) {
      toast(err.message || "Failed to send magic link", "error");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignInGoogle = async () => {
    setIsAuthBusy(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast(error.message, "error");
    } catch (err: any) {
      toast(err.message || "Failed to sign in with Google", "error");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast("Signed out. Local records remain on this device.", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncAll();
      await loadReports();
      onDataChanged();
      toast("Sync complete.", "success");
    } catch (err: any) {
      toast("Sync failed: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setIsDeleteAccountModalOpen(false);
      const res = await deleteAccountAndCloudData();
      if (res.success) {
        await loadReports();
        onDataChanged();
        toast("Your account and cloud data have been permanently deleted.", "info");
      } else {
        toast(res.error || "Could not delete account", "error");
      }
    } catch (err: any) {
      toast(err.message || "Could not delete account", "error");
    }
  };

  return (
    <div className="space-y-8 max-w-3xl pb-12">
      {/* ================= GROUP 1: APPEARANCE ================= */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Appearance
        </h3>
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Theme mode
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Select your visual preference. Defaults to your operating system.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] self-start sm:self-auto">
            {(
              [
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "System", icon: Monitor },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all tap-target cursor-pointer",
                  theme === id
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
                aria-label={`${label} theme`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      {/* ================= GROUP 2: ACCOUNT & CLOUD SYNC ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Account & Cloud Sync
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Optional sync across devices. Data remains saved locally in your browser first.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              {syncStatus === "syncing" && (
                <>
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                  <span className="text-blue-600 dark:text-blue-400">Syncing...</span>
                </>
              )}
              {syncStatus === "synced" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Synced</span>
                </>
              )}
              {syncStatus === "offline" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span className="text-[var(--text-muted)]">Offline</span>
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-600 dark:text-rose-400">Sync error</span>
                </>
              )}
            </div>
          )}
        </div>

        <Card className="p-4 sm:p-5 space-y-4">
          {!user ? (
            <div className="space-y-3.5">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Sign in to sync your health reports and metrics across your phone and PC.
                Signing in is completely optional — Gula works 100% offline without an account.
              </p>

              <form onSubmit={handleSendMagicLink} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)]"
                  disabled={isAuthBusy}
                  aria-label="Email address"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isAuthBusy || !authEmail.trim()}
                  icon={isAuthBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                >
                  Send magic link
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[var(--border-subtle)]" />
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-[var(--border-subtle)]" />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                onClick={handleSignInGoogle}
                disabled={isAuthBusy}
              >
                Continue with Google
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-bold text-xs uppercase">
                    {user.email.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {user.email}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {lastSyncedAt
                        ? `Last synced ${formatDate(new Date(lastSyncedAt).toISOString().split("T")[0])}`
                        : "Syncing with private cloud"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={handleSyncNow}
                    disabled={syncStatus === "syncing"}
                  >
                    Sync now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<LogOut className="w-3.5 h-3.5" />}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)]" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <h4 className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Delete my account and cloud data
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Permanently delete your cloud records, uploaded PDFs in storage, and your account.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={() => setIsDeleteAccountModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
                >
                  Delete account
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ================= GROUP 3: UPLOADED REPORTS & UNDO ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Uploaded reports ({activeReports.length})
          </h3>

          {/* Prominent Undo Last Upload Button */}
          {activeReports.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Undo2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
              onClick={() => setIsUndoConfirmOpen(true)}
              className="text-xs font-semibold"
            >
              Undo last upload
            </Button>
          )}
        </div>

        {activeReports.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No active reports
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Upload your first lab test PDF report to view and manage checkup records here.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--border-subtle)] overflow-hidden">
            {activeReports.map((report) => {
              const resultCount = resultsCountMap[report.id!] || 0;
              return (
                <div
                  key={report.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-secondary)]/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {report.fileName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)] flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.reportDate)}
                        </span>
                        <span>•</span>
                        <span>{report.labName || "Unknown lab"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {resultCount} {resultCount === 1 ? "result" : "results"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => handleViewPdf(report)}
                      className="text-xs"
                    >
                      View PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      onClick={() => setReportToRemove(report)}
                      className="text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Undone / Archived Reports Section */}
        {undoneReports.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowUndoneSection(!showUndoneSection)}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1 cursor-pointer tap-target"
            >
              {showUndoneSection ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>
                Undone reports ({undoneReports.length}) — kept hidden, not deleted
              </span>
            </button>

            {showUndoneSection && (
              <div className="mt-2 space-y-2">
                {undoneReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-secondary)] line-through">
                        {report.fileName}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Test date: {formatDate(report.reportDate)} • {report.labName || "Lab"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw className="w-3 h-3" />}
                        onClick={() => report.id && handleRestoreSpecific(report.id)}
                        className="text-xs h-7 px-2.5"
                      >
                        Restore
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3 text-rose-500" />}
                        onClick={() => report.id && handleDeletePermanently(report.id)}
                        className="text-xs h-7 px-2 text-rose-500 hover:bg-rose-500/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================= GROUP 4: UNITS PREFERENCE ================= */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Units preference
        </h3>
        <Card className="p-4 sm:p-5 space-y-4">
          {/* Glucose Units */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Blood glucose
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Standard conventional (mg/dL) or SI metric (mmol/L).
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              {(["mg/dL", "mmol/L"] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setGlucoseUnit(unit)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all tap-target cursor-pointer",
                    glucoseUnit === unit
                      ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)]" />

          {/* Cholesterol Units */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Lipids / Cholesterol
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Total cholesterol, LDL, and HDL measurement units.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              {(["mg/dL", "mmol/L"] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setCholesterolUnit(unit)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all tap-target cursor-pointer",
                    cholesterolUnit === unit
                      ? "bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ================= GROUP 5: DATA & BACKUP ================= */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Data
        </h3>
        <Card className="p-4 sm:p-5 space-y-4">
          {/* Export Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Export my data
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Download a full backup of all checkups and biomarker readings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportJson}
              >
                JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportCsv}
              >
                CSV
              </Button>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)]" />

          {/* Delete All Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Delete all data
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Permanently erase all reports and biomarker results stored in this browser.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
            >
              Delete all data
            </Button>
          </div>
        </Card>
      </section>

      {/* Honest Footer Line */}
      <footer className="pt-6 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)] leading-relaxed">
        Your data stays on this device and, if signed in, in your private cloud account. For information only, not medical advice.
      </footer>

      {/* ================= MODAL: UNDO CONFIRMATION SHEET ================= */}
      <Modal
        isOpen={isUndoConfirmOpen}
        onClose={() => setIsUndoConfirmOpen(false)}
        title="Undo the last upload?"
        description="The app will go back to your previous report."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            This will hide &quot;{activeReports[0]?.fileName}&quot; and immediately recompute all dashboard charts and metrics to reflect the prior state. You can restore it later if needed.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUndoConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmUndo}
            >
              Undo upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: REMOVE SPECIFIC REPORT CONFIRMATION ================= */}
      {reportToRemove && (
        <Modal
          isOpen={true}
          onClose={() => setReportToRemove(null)}
          title="Remove report?"
          description={`Remove "${reportToRemove.fileName}" from active dashboard?`}
          maxWidth="sm"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This report will be moved to the undone section. Its test results will be removed from your active charts.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportToRemove(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (reportToRemove.id) {
                    await db.reports.update(reportToRemove.id, { status: "undone", updatedAt: Date.now() });
                    await loadReports();
                    onDataChanged();
                    toast("Report removed.", "info");
                  }
                  setReportToRemove(null);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: DELETE ALL DATA CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteAllConfirmOpen}
        onClose={() => setIsDeleteAllConfirmOpen(false)}
        title="Delete all data permanently?"
        description="This action cannot be undone."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              All uploaded PDFs, parsed test results, and trend history will be permanently wiped from IndexedDB on this device.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteAllConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteAll}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: DELETE ACCOUNT CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        title="Delete account & cloud data?"
        description="This will permanently delete your remote cloud data and local files."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              All reports, results, and PDF documents in your private cloud account will be erased forever, along with your login account.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteAccountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              Delete account & data
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: VIEW PDF PREVIEW ================= */}
      {pdfViewReport && pdfBuffer && (
        <Modal
          isOpen={true}
          onClose={() => {
            setPdfViewReport(null);
            setPdfBuffer(null);
          }}
          title={pdfViewReport.fileName}
          description={`Report date: ${formatDate(pdfViewReport.reportDate)} • ${pdfViewReport.labName || "Lab report"}`}
          className="max-w-2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-secondary)] flex justify-center p-2 min-h-[320px]">
              <PdfPreview data={pdfBuffer} />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
              <span>Original file stored locally in browser</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPdfViewReport(null);
                  setPdfBuffer(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
