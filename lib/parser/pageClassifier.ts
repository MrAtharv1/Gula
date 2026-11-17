/**
 * Page classification engine for multi-section laboratory PDFs.
 *
 * Scans extracted pages and classifies them into:
 * - RESULT_DETAIL: authentic lab pages with 4-column tables (Test Name | Value | Unit | Range) and >= 1 result row.
 * - RESULT_SUMMARY: 3-column summary tables (Test Name | Result with inline unit | Range).
 * - INTERPRETATION_ONLY: pages that match the detail header but contain only clinical interpretation, risk tables, or reference guides.
 * - SKIP: marketing, wellness scores, roadmaps, flyers, instrument chromatograms, terms & conditions, about pages.
 */

import { ExtractedPage } from "./textExtractor";

export type PageClassification =
  | "RESULT_DETAIL"
  | "RESULT_SUMMARY"
  | "INTERPRETATION_ONLY"
  | "SKIP";

export interface PageClassificationResult {
  pageNumber: number;
  classification: PageClassification;
  reason: string;
  hasDetailHeader: boolean;
  hasSummaryHeader: boolean;
  valueRowCount: number;
}

export interface DocumentClassification {
  pages: PageClassificationResult[];
  pagesToParse: ExtractedPage[];
  pages_used: number[];
  pages_skipped: { pageNumber: number; reason: string }[];
  isFallbackSummary: boolean;
  hasResultPages: boolean;
  totalTextLength: number;
  isScanned: boolean;
}

/**
 * Classifies an individual page based on layout patterns, column headers, and content keywords.
 */
export function classifyPage(page: ExtractedPage): PageClassificationResult {
  const lines = page.lines;
  const fullText = page.fullText;

  // 1. High-priority SKIP keyword detection
  if (/peak name|concentration\s*\(\s*%\s*ngsp\s*\)|rt\s*\(\s*sec\s*\)/i.test(fullText)) {
    return {
      pageNumber: page.pageNumber,
      classification: "SKIP",
      reason: "Instrument chromatogram printout",
      hasDetailHeader: false,
      hasSummaryHeader: false,
      valueRowCount: 0,
    };
  }

  if (/terms and conditions|general terms|read in conjunction with/i.test(fullText)) {
    return {
      pageNumber: page.pageNumber,
      classification: "SKIP",
      reason: "Terms and conditions",
      hasDetailHeader: false,
      hasSummaryHeader: false,
      valueRowCount: 0,
    };
  }

  if (
    /about (?:redcliffe|dr lal|thyrocare|apollo|metropolis|pathology|diagnostic)|download the app|scan qr|fit india|package includes/i.test(
      fullText
    )
  ) {
    return {
      pageNumber: page.pageNumber,
      classification: "SKIP",
      reason: "Marketing flyer / About page",
      hasDetailHeader: false,
      hasSummaryHeader: false,
      valueRowCount: 0,
    };
  }

  if (
    /health score|your personal health roadmap|wellness overview|comprehensive wellness/i.test(
      fullText
    )
  ) {
    return {
      pageNumber: page.pageNumber,
      classification: "SKIP",
      reason: "Wellness overview / Health score / Roadmap",
      hasDetailHeader: false,
      hasSummaryHeader: false,
      valueRowCount: 0,
    };
  }

  // 2. Table Column Header Detection
  let hasDetailHeader = false;
  let hasSummaryHeader = false;

  for (const line of lines) {
    const hasNameCol = /(?:test description|test name|investigation|parameter|analyte)/i.test(line);
    const hasValCol = /(?:value\(?s?\)?|result\(?s?\)?)/i.test(line);
    const hasUnitCol = /(?:unit\(?s?\)?)/i.test(line);
    const hasRangeCol = /(?:reference|range|interval|normal|bio\.?\s*ref)/i.test(line);

    if (hasNameCol && hasValCol && hasUnitCol && hasRangeCol) {
      hasDetailHeader = true;
      break;
    } else if (hasNameCol && hasValCol && hasRangeCol && !hasUnitCol) {
      hasSummaryHeader = true;
    }
  }

  // 3. Count plausible test result rows
  const valueRows = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Filter out patient info, table headers, booking info
    if (
      /^(?:patient name|dob|gender|patient id|referred by|sample collected|report date|test description|test name|booking centre|processing lab|page \d+)/i.test(
        trimmed
      )
    ) {
      return false;
    }

    // Filter out method lines
    if (
      /^(?:cyanide free|electrical impedance|calculated|flow-cytometry|kinetic red cell|hplc|hexokinase|diazonium|urease|enzymatic|cmia|ferene|visual examination|microscopy)\b/i.test(
        trimmed
      )
    ) {
      return false;
    }

    // Filter out notes / interpretation banners
    if (
      /^(?:note|interpretation|please correlate|comments|disclaimer|methodology|risk stratification)/i.test(
        trimmed
      )
    ) {
      return false;
    }

    // 4-column row: Name + Value (number + flag) + Unit + Range
    const has4Col =
      /^([A-Za-z0-9\s,\-\/\(\)\.]+?)\s{2,}([<>]?\s*\d+(?:\.\d+)?)\s*([LH]\*|[LH]|CL\*|CH\*)?\s{2,}([A-Za-z%µ\/\^0-9]+)\s{2,}([<>]?\s*[\d\.\-\s–—to><]+.*)$/i.test(
        trimmed
      );

    // Qualitative test row (e.g. Urine analysis: Color, Protein, Glucose, Pus Cells, RBCs)
    const hasQualitative =
      /^(?:color|appearance|transparency|specific gravity|reaction|protein|glucose|ketones|bilirubin|urobilinogen|bile|pus cells|epithelial cells|red blood cells|rbc|yeast|casts|crystals)\b/i.test(
        trimmed
      ) &&
      /(?:nil|present|absent|normal|trace|clear|pale yellow|[0-9]+-[0-9]+|\d+(?:\.\d+)?)/i.test(
        trimmed
      );

    return has4Col || hasQualitative;
  });

  const valueRowCount = valueRows.length;

  // 4. Decision Logic
  if (hasDetailHeader) {
    if (valueRowCount > 0) {
      return {
        pageNumber: page.pageNumber,
        classification: "RESULT_DETAIL",
        reason: `Detailed lab results table (${valueRowCount} result rows)`,
        hasDetailHeader: true,
        hasSummaryHeader: false,
        valueRowCount,
      };
    } else {
      return {
        pageNumber: page.pageNumber,
        classification: "INTERPRETATION_ONLY",
        reason: "Detail header present but 0 test rows (interpretation / risk tables only)",
        hasDetailHeader: true,
        hasSummaryHeader: false,
        valueRowCount: 0,
      };
    }
  }

  if (hasSummaryHeader) {
    return {
      pageNumber: page.pageNumber,
      classification: "RESULT_SUMMARY",
      reason: "Summary table (Test Name | Result | Range)",
      hasDetailHeader: false,
      hasSummaryHeader: true,
      valueRowCount,
    };
  }

  return {
    pageNumber: page.pageNumber,
    classification: "SKIP",
    reason: "Cover page, informational header, or non-result content",
    hasDetailHeader: false,
    hasSummaryHeader: false,
    valueRowCount: 0,
  };
}

/**
 * Classifies all pages of a document and selects the relevant pages to parse.
 * - Prioritizes RESULT_DETAIL pages.
 * - Uses RESULT_SUMMARY pages as fallback only when 0 RESULT_DETAIL pages exist.
 * - Evaluates scan detection across the entire document (never page 1 alone).
 */
export function classifyDocumentPages(pages: ExtractedPage[]): DocumentClassification {
  const totalTextLength = pages.reduce((sum, p) => sum + p.fullText.length, 0);

  // Scanned detection: check whole document text, never page 1 alone
  const isScanned = totalTextLength < 30 || pages.every((p) => p.fullText.trim().length < 15);

  const classifiedPages = pages.map((p) => classifyPage(p));

  const detailPages = classifiedPages.filter((p) => p.classification === "RESULT_DETAIL");
  const summaryPages = classifiedPages.filter((p) => p.classification === "RESULT_SUMMARY");

  let pagesToParse: ExtractedPage[] = [];
  let isFallbackSummary = false;
  const pages_used: number[] = [];
  const pages_skipped: { pageNumber: number; reason: string }[] = [];

  if (detailPages.length > 0) {
    // Primary path: Use only RESULT_DETAIL pages
    const detailPageNums = new Set(detailPages.map((p) => p.pageNumber));
    pagesToParse = pages.filter((p) => detailPageNums.has(p.pageNumber));
    pages_used.push(...detailPages.map((p) => p.pageNumber));

    classifiedPages.forEach((cp) => {
      if (!detailPageNums.has(cp.pageNumber)) {
        pages_skipped.push({
          pageNumber: cp.pageNumber,
          reason: cp.reason,
        });
      }
    });
  } else if (summaryPages.length > 0) {
    // Fallback path: Use RESULT_SUMMARY pages only if no RESULT_DETAIL page exists
    isFallbackSummary = true;
    const summaryPageNums = new Set(summaryPages.map((p) => p.pageNumber));
    pagesToParse = pages.filter((p) => summaryPageNums.has(p.pageNumber));
    pages_used.push(...summaryPages.map((p) => p.pageNumber));

    classifiedPages.forEach((cp) => {
      if (!summaryPageNums.has(cp.pageNumber)) {
        pages_skipped.push({
          pageNumber: cp.pageNumber,
          reason: cp.reason,
        });
      }
    });
  } else {
    // No result pages found
    classifiedPages.forEach((cp) => {
      pages_skipped.push({
        pageNumber: cp.pageNumber,
        reason: cp.reason,
      });
    });
  }

  return {
    pages: classifiedPages,
    pagesToParse,
    pages_used,
    pages_skipped,
    isFallbackSummary,
    hasResultPages: pagesToParse.length > 0,
    totalTextLength,
    isScanned,
  };
}
