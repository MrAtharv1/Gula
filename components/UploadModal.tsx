"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Lock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldCheck,
  Pencil,
  Info,
} from "lucide-react";
import { extractPdfText } from "@/lib/parser/textExtractor";
import { parseReportText } from "@/lib/parser/reportParser";
import { classifyDocumentPages } from "@/lib/parser/pageClassifier";
import { ParsedBiomarker, ParsedReportResult } from "@/lib/parser/types";
import { matchMetric, evaluateResultFlag } from "@/lib/db/metricDictionary";
import { addReport } from "@/lib/db";
import { MetricCategory } from "@/lib/db/schema";
import { checkForDuplicateReport } from "@/lib/db/duplicateDetection";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { PdfPreview } from "./PdfPreview";
import { toast } from "@/lib/store/toastStore";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep =
  | "pick"
  | "preview"
  | "submitting"
  | "review"
  | "duplicate_confirm"
  | "review_low_confidence"
  | "partial_success";

const CLINICAL_CATEGORIES: MetricCategory[] = [
  "Blood",
  "Sugar",
  "Lipids",
  "Thyroid",
  "Liver",
  "Kidney",
  "Vitamins",
  "Hormones",
  "Other",
];

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Progress state during long report extraction
  const [progressMessage, setProgressMessage] = useState<string>("Reading report...");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Password state
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");

  // Extracted data state
  const [parsedResult, setParsedResult] = useState<ParsedReportResult | null>(null);
  const [editableBiomarkers, setEditableBiomarkers] = useState<ParsedBiomarker[]>([]);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [showSkippedDetails, setShowSkippedDetails] = useState<boolean>(false);

  // Date editing state
  const [customDate, setCustomDate] = useState<string>("");
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);

  // Drag state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep("pick");
    setFile(null);
    if (fileUrl) {
      try {
        URL.revokeObjectURL(fileUrl);
      } catch {}
      setFileUrl(null);
    }
    setErrorMessage(null);
    setProgressMessage("Reading report...");
    setProgressPercent(0);
    setIsPasswordProtected(false);
    setPassword("");
    setParsedResult(null);
    setEditableBiomarkers([]);
    setSkippedLines([]);
    setSavedCount(0);
    setShowSkippedDetails(false);
    setCustomDate("");
    setIsEditingDate(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // STEP 1: File selection & validation
  const validateAndLoadFile = async (selectedFile: File) => {
    setErrorMessage(null);
    setIsPasswordProtected(false);

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage("Please upload a PDF file.");
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setErrorMessage("File is too large. Max 20 MB.");
      return;
    }

    try {
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch {}
      }
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setFileUrl(url);
      setStep("preview");
    } catch (err) {
      console.error(err);
      setErrorMessage("Couldn't read this file.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await validateAndLoadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await validateAndLoadFile(e.target.files[0]);
    }
  };

  // STEP 2 & 3: Submit & Layout-Adaptive Parse with Progress Tracking
  const handleSubmit = async () => {
    if (!file) return;

    setStep("submitting");
    setErrorMessage(null);
    setProgressPercent(20);
    setProgressMessage("Classifying pages...");

    try {
      // 1. Extract text and spatial token items directly from the File object
      const extracted = await extractPdfText(file);

      // 2. Score and classify pages
      const classification = classifyDocumentPages(extracted.pages);
      const labPagesCount = classification.pagesToParse.length;

      setProgressPercent(60);
      setProgressMessage(
        labPagesCount > 0 ? `Reading ${labPagesCount} lab pages...` : "Reading lab pages..."
      );

      // 3. Parse report text through layout-adaptive extraction
      const parsed = parseReportText(extracted, extracted.pages.length);
      const testCount = (parsed.results || parsed.biomarkers || []).length;

      setProgressPercent(100);
      setProgressMessage(`Found ${testCount} tests`);

      // Validation: Scanned copy, no result tables, or empty document
      if (!parsed.biomarkers || parsed.biomarkers.length === 0) {
        setErrorMessage(
          parsed.errors[0] || "We couldn't find a results table in this file."
        );
        setStep("preview");
        return;
      }

      setParsedResult(parsed);
      setEditableBiomarkers(parsed.biomarkers || parsed.results || []);
      setSkippedLines(parsed.skippedLines || []);
      const detectedDate =
        parsed.reportDate || parsed.date || new Date().toISOString().split("T")[0];
      setCustomDate(detectedDate);

      // Brief visual pause so the user sees progress completion
      await new Promise((r) => setTimeout(r, 220));

      // 4. Duplicate Detection
      const candidateResults = (parsed.results || parsed.biomarkers || []).map((b) => ({
        metricKey: b.metricKey || b.canonicalKey || "unknown",
        value: b.value,
      }));

      const dupCheck = await checkForDuplicateReport(detectedDate, candidateResults);
      if (dupCheck.isDuplicate) {
        setStep("duplicate_confirm");
        return;
      }

      // 5. Open Review Modal
      setStep("review");
    } catch (err: any) {
      console.error(err);
      if (err.name === "PasswordException" || isPasswordProtected) {
        setErrorMessage("This PDF is locked. Remove the password and try again.");
      } else {
        setErrorMessage("Couldn't read this file.");
      }
      setStep("preview");
    }
  };

  // Category & Biomarker selection helpers
  const toggleCategory = (cat: string) => {
    const items = editableBiomarkers.filter((b) => (b.category || "Other") === cat);
    const allSelected = items.every((b) => b.selected !== false);
    const targetState = !allSelected;

    setEditableBiomarkers((prev) =>
      prev.map((b) =>
        (b.category || "Other") === cat ? { ...b, selected: targetState } : b
      )
    );
  };

  const toggleBiomarker = (id: string) => {
    setEditableBiomarkers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, selected: b.selected === false } : b))
    );
  };

  // Final database persistence
  const executeSave = async (
    biomarkersToSave: ParsedBiomarker[],
    unparsedLines: string[]
  ) => {
    if (!file || !parsedResult) return;

    try {
      const activeRows = biomarkersToSave.filter((b) => b.selected !== false);
      const resultsToInsert = activeRows.map((b) => {
        const name = b.displayName || b.name || "";
        const metricDef = matchMetric(name);
        const flag = evaluateResultFlag(b.value, b.refLow, b.refHigh);
        const resolvedKey = b.metricKey || b.canonicalKey || metricDef?.canonicalKey || "unknown";
        return {
          metricKey: resolvedKey,
          displayName: name,
          value: b.value,
          unit: b.unit,
          refLow: b.refLow,
          refHigh: b.refHigh,
          flag,
          category: (b.category || metricDef?.category || "Other") as MetricCategory,
        };
      });

      const finalDate =
        customDate ||
        parsedResult.reportDate ||
        parsedResult.date ||
        new Date().toISOString().split("T")[0];

      await addReport(
        {
          fileName: file.name,
          labName: parsedResult.labName,
          reportDate: finalDate,
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: file,
          parseWarnings: parsedResult.errors || parsedResult.warnings || [],
        },
        resultsToInsert
      );

      const count = resultsToInsert.length;
      setSavedCount(count);

      if (unparsedLines && unparsedLines.length > 0) {
        setStep("partial_success");
        onSuccess();
      } else {
        toast(`Report added. ${count} results updated.`, "success");
        onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMessage("Failed to save report to local database.");
      setStep("preview");
    }
  };

  // Active categories present in editableBiomarkers
  const presentCategories = CLINICAL_CATEGORIES.filter((cat) =>
    editableBiomarkers.some((b) => (b.category || "Other") === cat)
  );
  editableBiomarkers.forEach((b) => {
    const c = b.category || "Other";
    if (!presentCategories.includes(c)) {
      presentCategories.push(c);
    }
  });

  const selectedCount = editableBiomarkers.filter((b) => b.selected !== false).length;
  const totalCount = editableBiomarkers.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === "pick"
          ? "Upload report"
          : step === "preview"
          ? "Report preview"
          : step === "duplicate_confirm"
          ? "Possible duplicate"
          : step === "review"
          ? "Review report"
          : step === "partial_success"
          ? "Report added"
          : "Processing report"
      }
      maxWidth={step === "review" ? "xl" : "lg"}
    >
      <div className="space-y-4">
        {/* Inline Error Notice */}
        {errorMessage && (
          <div
            role="alert"
            className="px-3 py-2 rounded-lg bg-[var(--status-abnormal-bg)] border border-[var(--status-abnormal-border)] text-[12px] text-[var(--status-abnormal-text)] flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: PICK / DROP ================= */}
        {step === "pick" && (
          <div>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                dragActive
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-card)]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                Choose a PDF or drag it here
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                PDF only, up to 25 MB. Parsed locally on your device.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-normal-dot)]" />
              <span>Zero server uploads. 100% private and on-device.</span>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW SCREEN ================= */}
        {step === "preview" && file && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              {/* Left: PDF Canvas Preview */}
              <div className="md:w-1/2 rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center min-h-[260px]">
                <PdfPreview
                  url={fileUrl || undefined}
                  file={file || undefined}
                  password={password}
                  onPasswordRequired={() => setIsPasswordProtected(true)}
                />
              </div>

              {/* Right: File details & Submit action */}
              <div className="md:w-1/2 flex flex-col justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-medium text-[var(--text-primary)] truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1">
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">
                      Ready to parse
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      All tests, values, and reference ranges are processed locally.
                    </p>
                  </div>

                  {/* Password input if locked */}
                  {isPasswordProtected && (
                    <div className="p-3 rounded-lg bg-[var(--status-borderline-bg)] border border-[var(--status-borderline-border)] space-y-2">
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--status-borderline-text)]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Password-protected PDF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setIsPasswordProtected(false);
                            setStep("preview");
                          }}
                        >
                          Unlock
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <Button variant="ghost" size="sm" onClick={resetAll}>
                    Choose another
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isPasswordProtected}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SUBMITTING / PROGRESS ================= */}
        {step === "submitting" && (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                {progressMessage}
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] max-w-xs">
                Analyzing test names, numeric results, and reference intervals locally.
              </p>
            </div>

            {/* Visual progress track */}
            <div className="w-full max-w-xs h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW MODAL (PHASE 6) ================= */}
        {step === "review" && parsedResult && file && (
          <div className="space-y-4">
            {/* Header Strip: File & Prominent Test Date with Edit Pencil */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-[13px] font-medium text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs">
                  {file.name}
                </span>
                {parsedResult.labName && parsedResult.labName !== "Unknown lab" && (
                  <span className="text-[11px] text-[var(--text-muted)] truncate hidden sm:inline">
                    • {parsedResult.labName}
                  </span>
                )}
              </div>

              {/* Date Block with Edit Pencil */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] text-[var(--text-muted)]">Test date:</span>
                {isEditingDate ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tabular-nums"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEditingDate(false)}
                      className="text-[11px] px-2 py-0.5"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                      {customDate || "Unknown date"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingDate(true)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer transition-colors"
                      aria-label="Edit test date"
                      title="Edit test date"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Info Banner: Read X of Y pages (Z skipped) */}
            {parsedResult.pages_used && (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                <div className="p-3 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>
                      Read {parsedResult.pages_used.length} of{" "}
                      {parsedResult.totalPages || parsedResult.pages_used.length} pages
                      {parsedResult.pages_skipped && parsedResult.pages_skipped.length > 0
                        ? ` (${parsedResult.pages_skipped.length} non-result pages skipped)`
                        : ""}
                    </span>
                  </div>
                  {parsedResult.pages_skipped && parsedResult.pages_skipped.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showSkippedDetails ? "Hide details" : "View details"}</span>
                      {showSkippedDetails ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expandable skipped pages list */}
                {showSkippedDetails &&
                  parsedResult.pages_skipped &&
                  parsedResult.pages_skipped.length > 0 && (
                    <div className="px-3 pb-3 pt-1 border-t border-[var(--border-subtle)] max-h-40 overflow-y-auto space-y-1">
                      {parsedResult.pages_skipped.map((skip, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between text-[11px] text-[var(--text-muted)] py-0.5"
                        >
                          <span className="font-medium text-[var(--text-primary)] shrink-0 mr-2">
                            Page {skip.pageNumber}
                          </span>
                          <span className="text-right text-[var(--text-secondary)] truncate">
                            {skip.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Grouped Results by Category */}
            <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
              {presentCategories.map((category) => {
                const items = editableBiomarkers.filter(
                  (b) => (b.category || "Other") === category
                );
                if (items.length === 0) return null;
                const allSelected = items.every((b) => b.selected !== false);
                const categorySelectedCount = items.filter((b) => b.selected !== false).length;

                return (
                  <div key={category} className="divide-y divide-[var(--border-subtle)]">
                    {/* Category Header with Master Checkbox */}
                    <div className="px-3 py-2 bg-[var(--bg-secondary)] flex items-center justify-between text-[12px] sticky top-0 z-10">
                      <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleCategory(category)}
                          className="rounded border-[var(--border-strong)] w-3.5 h-3.5 text-[var(--accent)]"
                          aria-label={`Select all ${category} tests`}
                        />
                        <span>{category}</span>
                      </label>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {categorySelectedCount} of {items.length} selected
                      </span>
                    </div>

                    {/* Category Tests */}
                    {items.map((b) => {
                      const isSelected = b.selected !== false;
                      const isAbnormal =
                        b.flag === "high" ||
                        b.flag === "low" ||
                        b.status === "abnormal";
                      const isBorderline = b.flag === "borderline";
                      const isSummary = b.source === "summary";

                      return (
                        <div
                          key={b.id}
                          className={`px-3 py-2 flex items-center justify-between gap-3 text-[12px] transition-colors ${
                            isSelected
                              ? "hover:bg-[var(--bg-secondary)]/50"
                              : "opacity-40 bg-[var(--bg-secondary)]/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBiomarker(b.id)}
                              className="rounded border-[var(--border-strong)] w-3.5 h-3.5 text-[var(--accent)] shrink-0"
                              aria-label={`Select ${b.displayName || b.name || ""}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)] truncate">
                                  {b.displayName || b.name}
                                </span>
                                {isSummary && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    Summary
                                  </span>
                                )}
                              </div>
                              {b.method && (
                                <span className="text-[10px] text-[var(--text-muted)] truncate block">
                                  {b.method}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Value, Unit & Status Flag */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                              {b.value ?? 0}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] min-w-[36px]">
                              {b.unit || ""}
                            </span>
                            {isAbnormal && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)] border border-[var(--status-abnormal-border)] uppercase">
                                {b.flag || "abnormal"}
                              </span>
                            )}
                            {isBorderline && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--status-borderline-bg)] text-[var(--status-borderline-text)] border border-[var(--status-borderline-border)]">
                                Borderline
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                {selectedCount} of {totalCount} tests selected
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetAll}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    executeSave(editableBiomarkers, parsedResult.skippedLines || [])
                  }
                  disabled={selectedCount === 0}
                >
                  Import {selectedCount} {selectedCount === 1 ? "result" : "results"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= DUPLICATE CONFIRMATION ================= */}
        {step === "duplicate_confirm" && parsedResult && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">
                  This looks like a report you&apos;ve already added. Add anyway?
                </h4>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                  A report with test date {parsedResult.reportDate || parsedResult.date} and matching biomarker values is already in your dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep("review")}
              >
                Review anyway
              </Button>
            </div>
          </div>
        )}

        {/* ================= PARTIAL SUCCESS NOTIFICATION ================= */}
        {step === "partial_success" && (
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Added {savedCount} results. {skippedLines.length} {skippedLines.length === 1 ? "line" : "lines"} couldn&apos;t be read.
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Your recognized results have been saved to your health dashboard.
                </p>
              </div>
            </div>

            {/* Expander for skipped lines */}
            <div>
              <button
                type="button"
                onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline tap-target cursor-pointer"
              >
                <span>{showSkippedDetails ? "Hide details" : "View details"}</span>
                {showSkippedDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showSkippedDetails && (
                <div className="mt-2.5 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] max-h-40 overflow-y-auto space-y-1">
                  <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                    Skipped unparseable lines:
                  </span>
                  {skippedLines.map((line, idx) => (
                    <p
                      key={idx}
                      className="text-[12px] text-[var(--text-secondary)] truncate"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
