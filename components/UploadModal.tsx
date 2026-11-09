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
  Plus,
  Trash2,
} from "lucide-react";
import { extractPdfText } from "@/lib/parser/textExtractor";
import { parseReportText } from "@/lib/parser/reportParser";
import { ParsedBiomarker, ParsedReportResult } from "@/lib/parser/types";
import { matchMetric, evaluateResultFlag } from "@/lib/db/metricDictionary";
import { addReport } from "@/lib/db";
import { MetricCategory } from "@/lib/db/schema";
import { checkForDuplicateReport } from "@/lib/db/duplicateDetection";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
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
  | "duplicate_confirm"
  | "review_low_confidence"
  | "partial_success";

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password state
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");

  // Extracted data state
  const [parsedResult, setParsedResult] = useState<ParsedReportResult | null>(null);
  const [editableBiomarkers, setEditableBiomarkers] = useState<ParsedBiomarker[]>([]);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [showSkippedDetails, setShowSkippedDetails] = useState<boolean>(false);

  // Drag state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep("pick");
    setFile(null);
    setFileBuffer(null);
    setErrorMessage(null);
    setIsPasswordProtected(false);
    setPassword("");
    setParsedResult(null);
    setEditableBiomarkers([]);
    setSkippedLines([]);
    setSavedCount(0);
    setShowSkippedDetails(false);
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

    // Validation 1: Must be a PDF
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage("Please upload a PDF file.");
      return;
    }

    // Validation 2: Max 20 MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setErrorMessage("File is too large. Max 20 MB.");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      setFile(selectedFile);
      setFileBuffer(buffer);
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

  // STEP 2 & 3: Submit & Parse
  const handleSubmit = async () => {
    if (!file || !fileBuffer) return;
    setStep("submitting");
    setErrorMessage(null);

    try {
      // 1. Text extraction via PDF.js
      const extracted = await extractPdfText(fileBuffer);

      // Validation: No selectable text (scanned image)
      if (!extracted.fullText || extracted.fullText.trim().length < 15) {
        setErrorMessage(
          "This looks like a scanned copy. We can't read it yet. Try the original PDF from the lab."
        );
        setStep("preview");
        return;
      }

      // 2. Rule-based parsing
      const parsed = parseReportText(extracted.fullText, extracted.pages.length);

      // Validation: Text found but no tests recognized
      if (!parsed.biomarkers || parsed.biomarkers.length === 0) {
        setErrorMessage("We couldn't find any test results in this file.");
        setStep("preview");
        return;
      }

      setParsedResult(parsed);
      setEditableBiomarkers(parsed.biomarkers);
      setSkippedLines(parsed.skippedLines || []);

      // 3. Duplicate Detection
      const candidateResults = (parsed.results || parsed.biomarkers || []).map((b) => ({
        metricKey: b.metricKey || b.canonicalKey || matchMetric(b.displayName || b.name || "")?.canonicalKey || "unknown",
        value: b.value,
      }));

      const reportDateStr = parsed.reportDate || parsed.date || new Date().toISOString().split("T")[0];
      const dupCheck = await checkForDuplicateReport(reportDateStr, candidateResults);
      if (dupCheck.isDuplicate) {
        setStep("duplicate_confirm");
        return;
      }

      // 4. Check confidence: if more than 30% low confidence (< 0.7), show optional review step
      const items = parsed.results || parsed.biomarkers || [];
      const lowConfidenceCount = items.filter(
        (b) => typeof b.confidence === "number" && b.confidence < 0.7
      ).length;

      if (lowConfidenceCount > 0 && lowConfidenceCount / items.length > 0.3) {
        setStep("review_low_confidence");
        return;
      }

      // Otherwise: high confidence -> save immediately (one-click flow!)
      await executeSave(items, parsed.skippedLines || []);
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
          category: (metricDef ? metricDef.category : b.category || "Other") as MetricCategory,
        };
      });

      await addReport(
        {
          fileName: file.name,
          labName: parsedResult.labName,
          reportDate: parsedResult.reportDate || parsedResult.date || new Date().toISOString().split("T")[0],
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: file,
          parseWarnings: parsedResult.errors || parsedResult.warnings || [],
        },
        resultsToInsert
      );

      const count = resultsToInsert.length;
      setSavedCount(count);

      // If there were skipped lines, show partial success screen
      if (unparsedLines && unparsedLines.length > 0) {
        setStep("partial_success");
        onSuccess();
      } else {
        // One-click instant success
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
          : step === "review_low_confidence"
          ? "Review extracted results"
          : step === "partial_success"
          ? "Report added"
          : "Processing report"
      }
      maxWidth={step === "review_low_confidence" ? "xl" : "lg"}
    >
      <div className="space-y-4">
        {/* Inline Error Notice */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
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
              className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                dragActive
                  ? "border-[var(--accent)] bg-blue-500/5"
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

              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Choose a PDF or drag it here
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                PDF only, up to 20 MB. Parsed locally on your device.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero server uploads. 100% private and on-device.</span>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW SCREEN ================= */}
        {step === "preview" && file && fileBuffer && (
          <div className="space-y-4">
            {/* File info bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-[var(--accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            </div>

            {/* Password input if locked */}
            {isPasswordProtected && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span>This PDF is password-protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter PDF password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
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

            {/* Crisp PDF Canvas Preview */}
            <PdfPreview
              data={fileBuffer}
              password={password}
              onPasswordRequired={() => setIsPasswordProtected(true)}
            />

            {/* Action Buttons: Submit (Primary) & Choose another (Ghost) */}
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
        )}

        {/* ================= STEP 3: SUBMITTING / READING ================= */}
        {step === "submitting" && (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Reading report...
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              Analyzing test names, numeric results, and reference intervals locally.
            </p>
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
                onClick={() =>
                  executeSave(parsedResult.results || parsedResult.biomarkers || [], parsedResult.skippedLines || [])
                }
              >
                Add anyway
              </Button>
            </div>
          </div>
        )}

        {/* ================= OPTIONAL REVIEW (ONLY ON LOW CONFIDENCE) ================= */}
        {step === "review_low_confidence" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
              Please review a few extracted rows before finalizing.
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
              {editableBiomarkers.map((b) => (
                <div key={b.id} className="p-2.5 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={b.selected !== false}
                    onChange={() =>
                      setEditableBiomarkers((prev) =>
                        prev.map((item) =>
                          item.id === b.id ? { ...item, selected: !item.selected } : item
                        )
                      )
                    }
                    className="rounded border-[var(--border-strong)] w-4 h-4 text-[var(--accent)]"
                    aria-label={`Select ${b.displayName || b.name || ""}`}
                  />
                  <input
                    type="text"
                    value={b.displayName || b.name || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableBiomarkers((prev) =>
                        prev.map((item) => (item.id === b.id ? { ...item, displayName: val, name: val } : item))
                      );
                    }}
                    className="flex-1 font-medium text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-hidden px-1"
                  />
                  <input
                    type="number"
                    step="any"
                    value={b.value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditableBiomarkers((prev) =>
                        prev.map((item) => (item.id === b.id ? { ...item, value: val } : item))
                      );
                    }}
                    className="w-16 text-right font-semibold text-[var(--text-primary)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
                  />
                  <input
                    type="text"
                    value={b.unit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditableBiomarkers((prev) =>
                        prev.map((item) => (item.id === b.id ? { ...item, unit: val } : item))
                      );
                    }}
                    className="w-14 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-1 py-0.5 rounded"
                  />
                  <button
                    onClick={() =>
                      setEditableBiomarkers((prev) => prev.filter((item) => item.id !== b.id))
                    }
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  executeSave(editableBiomarkers, parsedResult?.skippedLines || [])
                }
              >
                Save results
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
                <div className="mt-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] max-h-40 overflow-y-auto space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Skipped unparseable lines:
                  </span>
                  {skippedLines.map((line, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-[var(--text-secondary)] font-mono truncate"
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
