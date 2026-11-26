"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  getLazyPdfBlob,
  deleteAccountAndCloudData,
} from "@/lib/sync/syncEngine";
import { computeBmi } from "@/lib/utils/profileExtractor";
import { exportDoctorReportPdf } from "@/lib/utils/doctorPdfExport";
import { toast } from "@/lib/store/toastStore";
import { formatDate } from "@/lib/utils/date";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";
import { SegmentedControl } from "./ui/SegmentedControl";
import { PdfPreview } from "./PdfPreview";
import { ThemeToggle } from "./ThemeToggle";
import { APP_LANGUAGES, AppLanguage, useTranslation } from "@/lib/i18n/translations";
import {
  Undo2,
  RotateCcw,
  Trash2,
  Download,
  FileText,
  Eye,
  Calendar,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Camera,
  ShieldCheck,
  FileDown,
  Loader2,
  LogIn,
  ChevronRight,
  Globe,
} from "lucide-react";

interface SettingsViewProps {
  onDataChanged: () => void;
  onOpenAuth?: () => void;
}

const PRIVACY_POLICY_POINTS = [
  {
    title: "Browser-first PDF parsing",
    body: "Lab PDFs are parsed directly in your browser to extract biomarkers and reference ranges. Patient IDs and barcodes are scrubbed from parsed biomarker metrics.",
  },
  {
    title: "Guest mode (up to 2 reports)",
    body: "Without signing in, your reports and profile fields stay stored locally in your browser’s IndexedDB and local storage until you sign in or clear them.",
  },
  {
    title: "Encrypted cloud storage & transit",
    body: "When you sign in via Email/Password or Google, synced reports and original PDFs are encrypted in transit (HTTPS/TLS) and encrypted at rest in private cloud storage.",
  },
  {
    title: "Strict per-user access control",
    body: "Database Row-Level Security (RLS) policies and user-scoped storage buckets ensure only your authenticated account can read, update, or download your records.",
  },
  {
    title: "Zero ad tracking or data selling",
    body: "We never sell, rent, or share your health data, blood test results, or profile information with advertisers, marketers, or third-party brokers.",
  },
  {
    title: "Full export & permanent deletion",
    body: "Download all reports and biomarker history anytime as JSON or CSV, or permanently erase your local browser data and cloud account with one confirmation.",
  },
];

/**
 * Resizes an image file to a lightweight square-ish JPEG/PNG data URL (max 256px)
 * so custom profile DPs fit comfortably inside persisted preferences.
 */
async function readAndResizeAvatar(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected image"));
    reader.readAsDataURL(file);
  });

  if (typeof document === "undefined") return rawDataUrl;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 256;
      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round((img.width || maxSize) * scale));
      const height = Math.max(1, Math.round((img.height || maxSize) * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export function SettingsView({ onDataChanged, onOpenAuth }: SettingsViewProps) {
  const {
    glucoseUnit,
    cholesterolUnit,
    profile,
    setGlucoseUnit,
    setCholesterolUnit,
    updateProfile,
    resetProfileAvatar,
    clearActiveProfile,
  } = usePreferenceStore();

  const { user, syncStatus } = useSyncStore();
  const { t, language, setLanguage } = useTranslation();

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      console.error("Failed to load reports in My Account:", err);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Derived auto-extracted metadata from reports
  const latestReport = activeReports[0] || null;
  const bmiValue = useMemo(
    () => computeBmi(profile?.heightCm || "", profile?.weightKg || ""),
    [profile?.heightCm, profile?.weightKg]
  );

  const effectiveAvatar = profile?.avatarDataUrl || user?.avatarUrl || "";
  const avatarInitials = useMemo(() => {
    const source = (profile?.fullName || user?.email || "").trim();
    if (!source) return "";
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }, [profile?.fullName, user?.email]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      toast("Please choose an image file (PNG, JPG, or WebP).", "error");
      return;
    }
    try {
      const dataUrl = await readAndResizeAvatar(selectedFile);
      updateProfile({ avatarDataUrl: dataUrl });
      toast("Profile photo updated.", "success");
    } catch (err) {
      console.error(err);
      toast("Couldn't load the selected image.", "error");
    } finally {
      e.target.value = "";
    }
  };

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
  const handleExportDoctorPdf = async () => {
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
      toast(err?.message || "Doctor PDF export failed.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonStr = await exportAllDataAsJson();
      downloadFile(
        jsonStr,
        `gula-export-${new Date().toISOString().split("T")[0]}.json`,
        "application/json"
      );
      toast("Exported data as JSON.", "success");
    } catch (err) {
      console.error(err);
      toast("JSON export failed.", "error");
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = await exportAllDataAsCsv();
      downloadFile(
        csvStr,
        `gula-biomarkers-${new Date().toISOString().split("T")[0]}.csv`,
        "text/csv"
      );
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
      clearActiveProfile();
      await loadReports();
      onDataChanged();
      toast("All health records have been permanently deleted.", "info");
    } catch (err) {
      console.error(err);
      toast("Failed to delete all data.", "error");
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

  const fieldInputClass =
    "w-full px-3 py-1.5 text-[12.5px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="space-y-8 max-w-3xl pb-12">
      {/* ================= MOBILE-ONLY QUICK CONTROLS (< md) ================= */}
      {/* Desktop shows these in the left sidebar; mobile/APK shows them here at top of My Account */}
      <section className="md:hidden space-y-3" aria-label="Mobile account, appearance and language controls">
        <Card className="p-4 space-y-4">
          {/* 1. Sign in / Account */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              {user ? "Signed in" : t.loginSignup}
            </span>
            <button
              type="button"
              onClick={() => onOpenAuth?.()}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-left transition-colors cursor-pointer"
            >
              {user ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center text-[11px] font-semibold uppercase shrink-0">
                      {(profile?.fullName || user.email).substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate leading-tight">
                        {profile?.fullName || user.email}
                      </p>
                      <p className="text-[11px] text-[var(--text-faint)] capitalize leading-tight mt-0.5">
                        {user.email} · {syncStatus}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                        {t.loginSignup}
                      </p>
                      <p className="text-[11px] text-[var(--text-faint)] leading-tight mt-0.5 truncate">
                        {t.syncAcrossDevices}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
                </>
              )}
            </button>
          </div>

          {/* 2. Appearance */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              {t.appearance}
            </span>
            <ThemeToggle compact />
          </div>

          {/* 3. Language */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
            <label
              htmlFor="mobile-account-language"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span>{t.language}</span>
            </label>
            <select
              id="mobile-account-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              className={fieldInputClass}
            >
              {APP_LANGUAGES.map((langOpt) => (
                <option key={langOpt.code} value={langOpt.code}>
                  {langOpt.nativeName} ({langOpt.name})
                </option>
              ))}
            </select>
          </div>
        </Card>
      </section>

      {/* ================= GROUP 1: ABOUT ME ================= */}
      <section className="space-y-3" aria-labelledby="about-me-heading">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3
            id="about-me-heading"
            className="text-[12px] font-semibold text-[var(--text-muted)]"
          >
            About me
          </h3>
          <span className="text-[11px] text-[var(--text-faint)]">
            Auto-filled from extracted reports where available
          </span>
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col-reverse md:flex-row gap-6 md:items-start">
            {/* Left: Editable & Auto-extracted Profile Fields */}
            <div className="flex-1 min-w-0 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Full name
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={profile?.fullName || ""}
                    onChange={(e) => updateProfile({ fullName: e.target.value })}
                    placeholder="Extracted or enter your name"
                    className={fieldInputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Account email
                  </label>
                  <input
                    id="profile-email"
                    type="text"
                    value={user?.email || "Guest mode (not signed in)"}
                    readOnly
                    className={`${fieldInputClass} opacity-75 cursor-default`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-age"
                    className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Age (years)
                  </label>
                  <input
                    id="profile-age"
                    type="number"
                    min={1}
                    max={120}
                    value={profile?.age || ""}
                    onChange={(e) => updateProfile({ age: e.target.value })}
                    placeholder="Age"
                    className={fieldInputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-sex"
                    className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Biological sex
                  </label>
                  <select
                    id="profile-sex"
                    value={profile?.sex || ""}
                    onChange={(e) =>
                      updateProfile({
                        sex: e.target.value as "" | "Male" | "Female" | "Other",
                      })
                    }
                    className={fieldInputClass}
                  >
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="profile-blood-group"
                    className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                  >
                    Blood group
                  </label>
                  <select
                    id="profile-blood-group"
                    value={profile?.bloodGroup || ""}
                    onChange={(e) => updateProfile({ bloodGroup: e.target.value })}
                    className={fieldInputClass}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="profile-height"
                      className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                    >
                      Height (cm)
                    </label>
                    <input
                      id="profile-height"
                      type="number"
                      min={40}
                      max={250}
                      value={profile?.heightCm || ""}
                      onChange={(e) => updateProfile({ heightCm: e.target.value })}
                      placeholder="cm"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-weight"
                      className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                    >
                      Weight (kg)
                    </label>
                    <input
                      id="profile-weight"
                      type="number"
                      min={10}
                      max={350}
                      step="0.1"
                      value={profile?.weightKg || ""}
                      onChange={(e) => updateProfile({ weightKg: e.target.value })}
                      placeholder="kg"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-conditions"
                  className="block text-[11px] font-medium text-[var(--text-muted)] mb-1"
                >
                  Conditions, allergies &amp; notes
                </label>
                <input
                  id="profile-conditions"
                  type="text"
                  value={profile?.conditions || ""}
                  onChange={(e) => updateProfile({ conditions: e.target.value })}
                  placeholder="e.g. Vegetarian, vitamin D supplement, penicillin allergy"
                  className={fieldInputClass}
                />
              </div>

              {/* Extracted Report Snapshot */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
                <span>
                  <strong className="font-medium text-[var(--text-secondary)]">Latest lab:</strong>{" "}
                  {latestReport?.labName || "No report uploaded"}
                </span>
                <span>
                  <strong className="font-medium text-[var(--text-secondary)]">Last checkup:</strong>{" "}
                  {latestReport ? formatDate(latestReport.reportDate) : "—"}
                </span>
                {bmiValue && (
                  <span>
                    <strong className="font-medium text-[var(--text-secondary)]">BMI:</strong>{" "}
                    <span className="tabular-nums">{bmiValue}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right: Profile Avatar / DP */}
            <div className="shrink-0 flex flex-col items-center gap-2.5 md:w-44 md:border-l md:border-[var(--border-subtle)] md:pl-6 md:pt-1">
              <div
                aria-label="Profile avatar"
                className="w-24 h-24 rounded-full overflow-hidden border border-[var(--border-strong)] shadow-[var(--shadow-sm)] bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-rose-500/15 flex items-center justify-center shrink-0"
              >
                {effectiveAvatar ? (
                  <img
                    src={effectiveAvatar}
                    alt="Profile picture"
                    className="w-full h-full object-cover"
                  />
                ) : avatarInitials ? (
                  <span className="text-xl font-semibold tracking-tight text-[var(--accent)] select-none">
                    {avatarInitials}
                  </span>
                ) : (
                  <User className="w-10 h-10 text-[var(--accent)]/80" strokeWidth={1.6} />
                )}
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                aria-label="Upload profile photo"
                className="hidden"
              />

              <div className="flex flex-col items-center gap-1 w-full">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full justify-center"
                >
                  {profile?.avatarDataUrl ? "Change photo" : "Upload DP"}
                </Button>

                {profile?.avatarDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetProfileAvatar();
                      toast("Reverted to default avatar.", "info");
                    }}
                    className="text-[11px] h-6 px-2 text-[var(--text-muted)]"
                  >
                    Use default
                  </Button>
                )}
              </div>

              <p className="text-[10.5px] text-[var(--text-faint)] text-center leading-tight">
                {profile?.avatarDataUrl
                  ? "Custom device photo"
                  : user?.avatarUrl
                  ? "Account photo"
                  : "Default avatar"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ================= GROUP: UNDO LAST UPLOAD ================= */}
      {activeReports.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)]">
            Undo last upload
          </h3>
          <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-[14px] font-medium text-[var(--text-primary)]">
                Revert to previous report
              </h4>
              <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                Hide &ldquo;{activeReports[0]?.fileName}&rdquo; and immediately restore previous calculations.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Undo2 className="w-3.5 h-3.5" />}
              onClick={() => setIsUndoConfirmOpen(true)}
            >
              Undo last upload
            </Button>
          </Card>
        </section>
      )}

      {/* ================= GROUP: UPLOADED REPORTS ================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)]">
            Uploaded reports ({activeReports.length})
          </h3>
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
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => setReportToRemove(report)}
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
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3" />}
                        onClick={() => report.id && handleDeletePermanently(report.id)}
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

      {/* ================= GROUP: UNITS PREFERENCE ================= */}
      <section className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)]">
          Units preference
        </h3>
        <Card className="divide-y divide-[var(--border-subtle)] overflow-hidden">
          {/* Glucose Units */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Blood glucose
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Standard conventional (mg/dL) or SI metric (mmol/L).
              </p>
            </div>

            <SegmentedControl
              options={[
                { value: "mg/dL", label: "mg/dL" },
                { value: "mmol/L", label: "mmol/L" },
              ]}
              value={glucoseUnit}
              onChange={(v) => setGlucoseUnit(v as "mg/dL" | "mmol/L")}
            />
          </div>

          {/* Cholesterol Units */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Lipids / Cholesterol
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Total cholesterol, LDL, and HDL measurement units.
              </p>
            </div>

            <SegmentedControl
              options={[
                { value: "mg/dL", label: "mg/dL" },
                { value: "mmol/L", label: "mmol/L" },
              ]}
              value={cholesterolUnit}
              onChange={(v) => setCholesterolUnit(v as "mg/dL" | "mmol/L")}
            />
          </div>
        </Card>
      </section>

      {/* ================= GROUP: DATA & BACKUP ================= */}
      <section className="space-y-3">
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)]">
          Data
        </h3>
        <Card className="divide-y divide-[var(--border-subtle)] overflow-hidden">
          {/* Export Data */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Export my data
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Download a physician-ready Gula PDF report (cover page, ranges &amp; trend graphs) or raw JSON/CSV backup.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                className="!bg-[#EC4899] hover:!bg-[#DB2777] !text-white"
                icon={
                  isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <img
                      src="/logo.png"
                      alt=""
                      aria-hidden="true"
                      className="w-3.5 h-3.5 object-contain rounded-full bg-white p-px"
                    />
                  )
                }
                disabled={isExportingPdf || activeReports.length === 0}
                onClick={handleExportDoctorPdf}
              >
                {isExportingPdf ? "Exporting..." : "Export pdf"}
              </Button>
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

          {/* Delete All Data */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--status-abnormal-text)]">
                Delete all data
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Permanently erase all reports and biomarker results stored in this browser.
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setIsDeleteAllConfirmOpen(true)}
            >
              Delete all data
            </Button>
          </div>

          {/* Delete Cloud Account (shown only when signed in) */}
          {user && (
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--status-abnormal-text)]">
                  Delete account &amp; cloud data
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Permanently remove your encrypted cloud records, uploaded PDFs, and account.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsDeleteAccountModalOpen(true)}
              >
                Delete account
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* ================= GROUP: PRIVACY POLICY ================= */}
      <section className="space-y-3" aria-labelledby="privacy-policy-heading">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-normal-dot)]" />
          <h3
            id="privacy-policy-heading"
            className="text-[12px] font-semibold text-[var(--text-muted)]"
          >
            Privacy policy
          </h3>
        </div>
        <Card className="p-4 sm:p-5">
          <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
            {PRIVACY_POLICY_POINTS.map((item, idx) => (
              <li key={item.title} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[10.5px] font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span>
                  <strong className="font-semibold text-[var(--text-primary)]">
                    {item.title}:
                  </strong>{" "}
                  {item.body}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Honest Privacy Footer Line */}
      <footer className="pt-6 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)] leading-relaxed">
        Your health data is encrypted and securely stored. We never sell it or use it for ads. For information only, not medical advice.
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
          <div className="p-3 rounded-xl bg-[var(--status-abnormal-bg)] border border-[var(--status-abnormal-border)] text-xs text-[var(--status-abnormal-text)] flex items-start gap-2">
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
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteAll}
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
          <div className="p-3 rounded-xl bg-[var(--status-abnormal-bg)] border border-[var(--status-abnormal-border)] text-xs text-[var(--status-abnormal-text)] flex items-start gap-2">
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
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteAccount}
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
              <span>Original PDF stored in encrypted storage</span>
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
