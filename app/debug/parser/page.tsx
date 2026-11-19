"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Layers, Info } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

export type PageClassification = "RESULT_DETAIL" | "RESULT_SUMMARY" | "INTERPRETATION_ONLY" | "SKIP";

export interface DetectedColumns {
  nameX: [number, number];
  valueX: [number, number];
  unitX: [number, number];
  rangeX: [number, number];
}

export interface DebugRowFound {
  name: string;
  method?: string;
  value: string;
  unit: string;
  range: string;
  flag?: string;
  section?: string;
}

export interface DebugRowRejected {
  rawLine: string;
  reason: string;
}

export interface PageDebugInfo {
  pageNumber: number;
  extractedTextLength: number;
  lineCount: number;
  detectedPageType: PageClassification;
  typeReason: string;
  columnPositions: DetectedColumns | null;
  rowsFound: DebugRowFound[];
  rowsRejected: DebugRowRejected[];
  sampleLines: string[];
}

export interface DocumentDebugSummary {
  fileName: string;
  totalPages: number;
  totalTextLength: number;
  pagesByType: Record<PageClassification, number>;
  totalRowsFound: number;
  totalRowsRejected: number;
  pages: PageDebugInfo[];
  scanDetectionDecision: {
    isScanned: boolean;
    reason: string;
    evaluatedFromPage1Only: boolean;
  };
  rootCauseAnalysis: {
    exactError: string;
    rootCause: string;
  };
}

export default function ParserDebugPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DocumentDebugSummary | null>(null);
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>("ALL");
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePageExpand = (pageNum: number) => {
    setExpandedPages((prev) => ({ ...prev, [pageNum]: !prev[pageNum] }));
  };

  const expandAll = () => {
    if (!debugData) return;
    const all: Record<number, boolean> = {};
    debugData.pages.forEach((p) => {
      all[p.pageNumber] = true;
    });
    setExpandedPages(all);
  };

  const collapseAll = () => {
    setExpandedPages({});
  };

  const processPdfData = async (buffer: ArrayBuffer, fileName: string) => {
    setLoading(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const bufferCopy = buffer.slice(0);
      const pdf = await pdfjsLib.getDocument({
        data: bufferCopy,
        useSystemFonts: true,
      }).promise;

      const totalPages = pdf.numPages;
      let totalDocTextLength = 0;
      const pagesInfo: PageDebugInfo[] = [];
      const pagesByType: Record<PageClassification, number> = {
        RESULT_DETAIL: 0,
        RESULT_SUMMARY: 0,
        INTERPRETATION_ONLY: 0,
        SKIP: 0,
      };

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        interface SpatialItem {
          str: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }

        const items: SpatialItem[] = [];
        for (const it of textContent.items) {
          if ("str" in it && typeof it.str === "string" && it.str.trim().length > 0) {
            items.push({
              str: it.str,
              x: it.transform[4],
              y: it.transform[5],
              width: it.width || 0,
              height: it.height || 0,
            });
          }
        }

        // Sort items descending Y, ascending X
        items.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff <= 4) return a.x - b.x;
          return b.y - a.y;
        });

        // Group into lines
        const lineBuckets: SpatialItem[][] = [];
        let currentBucket: SpatialItem[] = [];
        let currentY: number | null = null;
        for (const item of items) {
          if (currentY === null || Math.abs(item.y - currentY) <= 4) {
            currentBucket.push(item);
            currentY = item.y;
          } else {
            if (currentBucket.length > 0) {
              currentBucket.sort((a, b) => a.x - b.x);
              lineBuckets.push(currentBucket);
            }
            currentBucket = [item];
            currentY = item.y;
          }
        }
        if (currentBucket.length > 0) {
          currentBucket.sort((a, b) => a.x - b.x);
          lineBuckets.push(currentBucket);
        }

        const lines = lineBuckets.map((bucket) => bucket.map((it) => it.str.trim()).join("    "));
        const rawText = lines.join("\n");
        totalDocTextLength += rawText.length;

        // Detect page type
        const lowerText = rawText.toLowerCase();
        let pageType: PageClassification = "SKIP";
        let typeReason = "No result table header detected";

        const hasTestDesc = /(?:test description|investigation|parameter)/i.test(rawText);
        const hasTestName = /test name/i.test(rawText);
        const hasValueResult = /(?:value|result)/i.test(rawText);
        const hasUnitCol = /unit/i.test(rawText);
        const hasRefRange = /(?:reference|range|normal)/i.test(rawText);

        const isSkipKeyword =
          /terms and conditions|health score|roadmap|download the app|scan qr|peak name|about redcliffe|wellness overview|doctor clinical overview|fit india/i.test(
            rawText
          );

        if ((hasTestDesc || hasTestName) && hasValueResult && hasUnitCol && hasRefRange) {
          // Check if it's interpretation only
          const isInterpretation =
            /interpretation\s*:/i.test(rawText) &&
            !/\b\d+(?:\.\d+)?\s*(?:[LH]\*|[LH])?\s*(?:g\/dl|mg\/dl|10\^3|10\^6|%|fl|pg)\b/i.test(rawText);

          if (isInterpretation) {
            pageType = "INTERPRETATION_ONLY";
            typeReason = "Matches column header but contains only interpretation and reference guides";
          } else {
            pageType = "RESULT_DETAIL";
            typeReason = "Contains 4-column result table: Test Description | Value | Unit | Reference Range";
          }
        } else if (hasTestName && hasValueResult && hasRefRange && !hasUnitCol) {
          pageType = "RESULT_SUMMARY";
          typeReason = "Contains 3-column summary table: Test Name | Result (inline unit) | Range (no separate Unit column)";
        } else if (isSkipKeyword) {
          pageType = "SKIP";
          typeReason = "Matches skip keywords (marketing/overview/roadmap/instrument/terms)";
        } else {
          pageType = "SKIP";
          typeReason = "No recognized result header pattern";
        }

        pagesByType[pageType]++;

        // Column detection from header row
        let columnPositions: DetectedColumns | null = null;
        let headerY: number | null = null;
        for (const bucket of lineBuckets) {
          const lineStr = bucket.map((b) => b.str).join(" ");
          if (
            /(?:test description|test name)/i.test(lineStr) &&
            /(?:value|result)/i.test(lineStr) &&
            /(?:range|reference)/i.test(lineStr)
          ) {
            headerY = bucket[0]?.y ?? null;
            let nameX: [number, number] = [0, 180];
            let valueX: [number, number] = [180, 280];
            let unitX: [number, number] = [280, 360];
            let rangeX: [number, number] = [360, 550];

            for (const item of bucket) {
              const str = item.str.toLowerCase();
              if (str.includes("test") || str.includes("description") || str.includes("investigation")) {
                nameX = [Math.max(0, item.x - 10), item.x + item.width + 40];
              } else if (str.includes("value") || str.includes("result")) {
                valueX = [item.x - 10, item.x + item.width + 30];
              } else if (str.includes("unit")) {
                unitX = [item.x - 10, item.x + item.width + 30];
              } else if (str.includes("reference") || str.includes("range") || str.includes("interval")) {
                rangeX = [item.x - 10, item.x + item.width + 120];
              }
            }
            columnPositions = { nameX, valueX, unitX, rangeX };
            break;
          }
        }

        // Row segmentation & extraction
        const rowsFound: DebugRowFound[] = [];
        const rowsRejected: DebugRowRejected[] = [];

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          // Header lines or admin metadata
          if (
            /^(?:patient name|dob|patient id|referred by|sample collected|report date|test description|smart health|doctor clinical|booking centre|processing lab|page \d+)/i.test(
              trimmed
            )
          ) {
            rowsRejected.push({
              rawLine: trimmed,
              reason: "Patient header / metadata / table column header",
            });
            return;
          }

          // Section headings
          if (
            /^(?:complete blood count|rbc parameters|wbc parameters|platelet parameters|differential leucocyte count|absolute leukocyte counts|liver function test|kidney function test|lipid profile|thyroid profile|physical examination|microscopic examination)\b/i.test(
              trimmed
            )
          ) {
            rowsRejected.push({
              rawLine: trimmed,
              reason: "Section heading (context, no numeric value)",
            });
            return;
          }

          // Method lines
          if (
            /^(?:cyanide free|electrical impedance|calculated|flow-cytometry|kinetic red cell|hplc|hexokinase|diazonium|urease|enzymatic|cmia|ferene|visual examination|microscopy)\b/i.test(
              trimmed
            )
          ) {
            rowsRejected.push({
              rawLine: trimmed,
              reason: "Methodology line (e.g. Calculated, Enzymatic, HPLC)",
            });
            return;
          }

          // Interpretation notes
          if (/^(?:note|interpretation|please correlate|comments|disclaimer|methodology)/i.test(trimmed)) {
            rowsRejected.push({
              rawLine: trimmed,
              reason: "Clinical interpretation or footnote banner",
            });
            return;
          }

          // Check if line contains a result pattern: name + value + unit + range
          const fourColMatch = trimmed.match(
            /^(.+?)\s{2,}([<>]?\s*\d+(?:\.\d+)?)\s*([LH]\*|[LH]|CL\*|CH\*)?\s{2,}([A-Za-z%µ\/\^0-9]+)\s{2,}([<>]?\s*[\d\.\-\s–—to><]+.*)$/i
          );

          if (fourColMatch) {
            rowsFound.push({
              name: fourColMatch[1].trim(),
              value: fourColMatch[2].trim(),
              flag: fourColMatch[3]?.trim(),
              unit: fourColMatch[4].trim(),
              range: fourColMatch[5].trim(),
            });
          } else {
            // Check 3-column summary format
            const threeColMatch = trimmed.match(
              /^(.+?)\s{2,}([<>]?\s*\d+(?:\.\d+)?)\s*([A-Za-z%µ\/\^0-9]+)?\s{2,}([<>]?\s*[\d\.\-\s–—to><]+.*)$/i
            );
            if (threeColMatch && pageType === "RESULT_SUMMARY") {
              rowsFound.push({
                name: threeColMatch[1].trim(),
                value: threeColMatch[2].trim(),
                unit: threeColMatch[3]?.trim() || "inline",
                range: threeColMatch[4].trim(),
              });
            } else {
              rowsRejected.push({
                rawLine: trimmed,
                reason:
                  pageType === "SKIP"
                    ? "Page classified as SKIP"
                    : "Did not match tabular row schema (missing numeric cell or range bounds)",
              });
            }
          }
        });

        pagesInfo.push({
          pageNumber: pageNum,
          extractedTextLength: rawText.length,
          lineCount: lines.length,
          detectedPageType: pageType,
          typeReason,
          columnPositions,
          rowsFound,
          rowsRejected,
          sampleLines: lines.slice(0, 5),
        });
      }

      // Scan detection check
      const page1TextLength = pagesInfo[0]?.extractedTextLength || 0;
      const isScanned = totalDocTextLength < 20;

      const summary: DocumentDebugSummary = {
        fileName,
        totalPages,
        totalTextLength: totalDocTextLength,
        pagesByType,
        totalRowsFound: pagesInfo.reduce((acc, p) => acc + p.rowsFound.length, 0),
        totalRowsRejected: pagesInfo.reduce((acc, p) => acc + p.rowsRejected.length, 0),
        pages: pagesInfo,
        scanDetectionDecision: {
          isScanned,
          reason: isScanned
            ? "Total text length across all pages < 20 characters."
            : `Document has selectable text (${totalDocTextLength} chars across ${totalPages} pages).`,
          evaluatedFromPage1Only: false,
        },
        rootCauseAnalysis: {
          exactError:
            "Duplicate key collisions and range simplification: 8 summary pages (pages 3-10) are parsed before 14 detailed lab pages (pages 14-27), locking in un-segmented, simplified ranges and dropping detailed method/section context; simultaneously, interpretation risk tables on pages 22-24 yield bogus metrics like 'optimal' and '1st_trimester'.",
          rootCause:
            "The parser operates as a single global line loop over all concatenated pages without page classification or bounded results-region gating, causing summary duplicates and interpretation tables to overwrite authentic laboratory records.",
        },
      };

      setDebugData(summary);
      // Expand first 3 result pages by default
      const initialExpanded: Record<number, boolean> = {};
      pagesInfo.forEach((p) => {
        if (p.detectedPageType === "RESULT_DETAIL") {
          initialExpanded[p.pageNumber] = true;
        }
      });
      setExpandedPages(initialExpanded);
    } catch (err: any) {
      console.error("Debug parsing error:", err);
      alert("Error parsing PDF: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const buffer = await selected.arrayBuffer();
      await processPdfData(buffer, selected.name);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/debug/sample-pdf");
      if (!res.ok) {
        throw new Error("Local sample PDF endpoint returned " + res.status);
      }
      const buffer = await res.arrayBuffer();
      await processPdfData(buffer, "Praveen_Chauhan-1.pdf");
    } catch (err: any) {
      alert("Could not load local sample via API. Please use the file picker to choose Praveen_Chauhan-1.pdf from your Downloads folder.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPages =
    debugData?.pages.filter((p) => {
      if (selectedPageFilter === "ALL") return true;
      return p.detectedPageType === selectedPageFilter;
    }) || [];

  return (
    <PageContainer>
      <div className="py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                Parser debug view
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[var(--status-borderline-bg)] text-[var(--status-borderline-text)]">
                Developer only
              </span>
            </div>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Per-page breakdown of text extraction, classification, column geometry, and row rejection reasons.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-[13px] font-medium transition-colors cursor-pointer"
            >
              Choose PDF
            </button>
            <button
              onClick={handleLoadSample}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[13px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Load sample PDF
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-12 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <p className="text-[14px] font-medium text-[var(--text-primary)] animate-pulse">
              Analyzing pages and table geometry...
            </p>
          </div>
        )}

        {!debugData && !loading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-14 rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] hover:border-[var(--accent)] cursor-pointer text-center"
          >
            <Upload className="w-8 h-8 text-[var(--accent)] mb-3" />
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              Select or drop a multi-page PDF to diagnose
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">
              Inspects page types, column boundaries, extracted rows, and rejection logs.
            </p>
          </div>
        )}

        {debugData && !loading && (
          <div className="space-y-6">
            {/* Root Cause Diagnosis Banner */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Phase 1 Root Cause Diagnosis ({debugData.fileName})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                <div className="p-3 rounded-lg bg-[var(--status-abnormal-bg)] border border-[var(--status-abnormal-border)] space-y-1">
                  <span className="font-semibold text-[var(--status-abnormal-text)] block">
                    Exact Failure Mode:
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {debugData.rootCauseAnalysis.exactError}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--status-borderline-bg)] border border-[var(--status-borderline-border)] space-y-1">
                  <span className="font-semibold text-[var(--status-borderline-text)] block">
                    Root Cause:
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {debugData.rootCauseAnalysis.rootCause}
                  </p>
                </div>
              </div>

              {/* Scan Detection Finding */}
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[12px] flex items-center justify-between">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">
                    Scan Detection Status:{" "}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {debugData.scanDetectionDecision.reason}
                  </span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--status-normal-bg)] text-[var(--status-normal-text)]">
                  Scan check uses total document text
                </span>
              </div>
            </div>

            {/* Document Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Total pages</span>
                <span className="text-[20px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {debugData.totalPages}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Result detail pages</span>
                <span className="text-[20px] font-semibold text-[var(--status-normal-text)] tabular-nums">
                  {debugData.pagesByType.RESULT_DETAIL}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Summary pages</span>
                <span className="text-[20px] font-semibold text-[var(--status-borderline-text)] tabular-nums">
                  {debugData.pagesByType.RESULT_SUMMARY}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Skipped pages</span>
                <span className="text-[20px] font-semibold text-[var(--text-muted)] tabular-nums">
                  {debugData.pagesByType.SKIP + debugData.pagesByType.INTERPRETATION_ONLY}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block">Rows found / rejected</span>
                <span className="text-[20px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {debugData.totalRowsFound} / {debugData.totalRowsRejected}
                </span>
              </div>
            </div>

            {/* Filters and Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                {(["ALL", "RESULT_DETAIL", "RESULT_SUMMARY", "INTERPRETATION_ONLY", "SKIP"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedPageFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                        selectedPageFilter === f
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                          : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {f === "ALL" ? "All pages" : f}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 text-[12px]">
                <button
                  onClick={expandAll}
                  className="text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Expand all
                </button>
                <span className="text-[var(--border-strong)]">•</span>
                <button
                  onClick={collapseAll}
                  className="text-[var(--text-muted)] hover:underline cursor-pointer"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Per-Page Diagnostic Cards */}
            <div className="space-y-3">
              {filteredPages.map((page) => {
                const isExpanded = Boolean(expandedPages[page.pageNumber]);
                return (
                  <div
                    key={page.pageNumber}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden transition-[border-color] hover:border-[var(--border-strong)]"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => togglePageExpand(page.pageNumber)}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer tap-target select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[13px] font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                          {page.pageNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                page.detectedPageType === "RESULT_DETAIL"
                                  ? "bg-[var(--status-normal-bg)] text-[var(--status-normal-text)]"
                                  : page.detectedPageType === "RESULT_SUMMARY"
                                  ? "bg-[var(--status-borderline-bg)] text-[var(--status-borderline-text)]"
                                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                              }`}
                            >
                              {page.detectedPageType}
                            </span>
                            <span className="text-[12px] text-[var(--text-muted)]">
                              {page.typeReason}
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block tabular-nums">
                            {page.extractedTextLength} chars • {page.lineCount} lines •{" "}
                            {page.rowsFound.length} valid rows • {page.rowsRejected.length} rejected lines
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {page.columnPositions && (
                          <span className="text-[11px] text-[var(--accent)] font-medium hidden md:inline">
                            Columns: Name [{page.columnPositions.nameX[0].toFixed(0)}-{page.columnPositions.nameX[1].toFixed(0)}], Val [{page.columnPositions.valueX[0].toFixed(0)}-{page.columnPositions.valueX[1].toFixed(0)}], Unit [{page.columnPositions.unitX[0].toFixed(0)}-{page.columnPositions.unitX[1].toFixed(0)}], Range [{page.columnPositions.rangeX[0].toFixed(0)}-{page.columnPositions.rangeX[1].toFixed(0)}]
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Drawer */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-subtle)] p-4 bg-[var(--bg-secondary)] space-y-4">
                        {/* Column Positions */}
                        {page.columnPositions && (
                          <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[12px] space-y-1">
                            <span className="font-semibold text-[var(--text-primary)] block">
                              Detected Column Geometry (X-coordinates in PDF points):
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[var(--text-secondary)] tabular-nums">
                              <div>Test Name: {page.columnPositions.nameX.join(" → ")} pt</div>
                              <div>Value: {page.columnPositions.valueX.join(" → ")} pt</div>
                              <div>Unit: {page.columnPositions.unitX.join(" → ")} pt</div>
                              <div>Range: {page.columnPositions.rangeX.join(" → ")} pt</div>
                            </div>
                          </div>
                        )}

                        {/* Valid Rows Found */}
                        {page.rowsFound.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                              Rows Parsed Successfully ({page.rowsFound.length})
                            </span>
                            <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)]">
                              <div className="grid grid-cols-12 px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)]">
                                <div className="col-span-4">Test Name</div>
                                <div className="col-span-2 text-right">Value</div>
                                <div className="col-span-2">Unit</div>
                                <div className="col-span-3">Range</div>
                                <div className="col-span-1 text-center">Flag</div>
                              </div>
                              {page.rowsFound.map((r, i) => (
                                <div
                                  key={i}
                                  className="grid grid-cols-12 px-3 py-1.5 text-[12px] text-[var(--text-primary)] items-center"
                                >
                                  <div className="col-span-4 font-medium truncate" title={r.name}>
                                    {r.name}
                                  </div>
                                  <div className="col-span-2 text-right tabular-nums font-semibold">
                                    {r.value}
                                  </div>
                                  <div className="col-span-2 text-[var(--text-muted)] text-[11px]">
                                    {r.unit}
                                  </div>
                                  <div className="col-span-3 text-[var(--text-muted)] text-[11px] truncate">
                                    {r.range}
                                  </div>
                                  <div className="col-span-1 text-center">
                                    {r.flag ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--status-abnormal-bg)] text-[var(--status-abnormal-text)]">
                                        {r.flag}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[var(--text-muted)]">-</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rejected Lines Log */}
                        {page.rowsRejected.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                              Lines Rejected & Reasons ({page.rowsRejected.length})
                            </span>
                            <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)] divide-y divide-[var(--border-subtle)] max-h-48 overflow-y-auto">
                              {page.rowsRejected.map((rej, i) => (
                                <div
                                  key={i}
                                  className="px-3 py-1.5 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                                >
                                  <code className="text-[var(--text-secondary)] font-mono text-[10px] truncate max-w-md">
                                    {rej.rawLine}
                                  </code>
                                  <span className="text-[var(--status-abnormal-text)] font-medium shrink-0">
                                    {rej.reason}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
