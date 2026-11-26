import { getDashboardData, getResultsCountByReport } from "@/lib/db";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import {
  LatestResultSummary,
  MetricCategory,
  Report,
  ResultWithDate,
} from "@/lib/db/schema";
import { UserProfile } from "@/lib/store/preferenceStore";
import { computeBmi } from "@/lib/utils/profileExtractor";

const PANEL_ORDER: { category: MetricCategory; title: string }[] = [
  { category: "Blood", title: "Complete Blood Count (CBC)" },
  { category: "Sugar", title: "Sugar & Metabolic Panel" },
  { category: "Lipids", title: "Lipid / Cholesterol Profile" },
  { category: "Liver", title: "Liver Function Tests (LFT)" },
  { category: "Kidney", title: "Kidney Function & Electrolytes (KFT)" },
  { category: "Thyroid", title: "Thyroid Panel" },
  { category: "Vitamins", title: "Vitamins & Iron Studies" },
  { category: "Hormones", title: "Hormone Panel" },
  { category: "Other", title: "General Biomarkers" },
];

export interface DoctorReportRow {
  metricKey: string;
  displayName: string;
  category: MetricCategory;
  referenceRange: string;
  refLow?: number;
  refHigh?: number;
  historySorted: ResultWithDate[];
  readingsByDate: Record<string, ResultWithDate | undefined>;
}

export interface DoctorReportPanel {
  category: MetricCategory;
  title: string;
  rows: DoctorReportRow[];
}

export interface DoctorReportModel {
  generatedAt: string;
  generatedAtFormatted: string;
  reportsChronological: Report[];
  uniqueDates: string[];
  resultsCountByReport: Record<number, number>;
  totalMetrics: number;
  abnormalLatest: LatestResultSummary[];
  panels: DoctorReportPanel[];
}

/**
 * Normalizes non-WinAnsi glyphs so built-in PDF Helvetica renders cleanly without broken symbols.
 */
export function sanitizePdfText(input: string): string {
  return String(input || "")
    .replace(/µ|μ/g, "u")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/↑/g, "+")
    .replace(/↓/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/•/g, "|");
}

/**
 * Formats dates consistently in `10 Oct 2020` style across the Doctor PDF.
 */
export function formatDoctorDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = isoMatch
      ? new Date(
          Number(isoMatch[1]),
          Number(isoMatch[2]) - 1,
          Number(isoMatch[3])
        )
      : new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDoctorReferenceRange(summary: LatestResultSummary): string {
  const dict = METRIC_DICTIONARY[summary.metricKey];
  const low = summary.latestResult.refLow ?? dict?.defaultLow;
  const high = summary.latestResult.refHigh ?? dict?.defaultHigh;
  const unit = sanitizePdfText(
    summary.latestResult.unit || summary.standardUnit || ""
  ).trim();

  if (low != null && high != null) {
    return unit ? `${low} - ${high} ${unit}` : `${low} - ${high}`;
  }
  if (high != null) {
    return unit ? `< ${high} ${unit}` : `< ${high}`;
  }
  if (low != null) {
    return unit ? `> ${low} ${unit}` : `> ${low}`;
  }
  return unit ? `Unit: ${unit}` : "-";
}

/**
 * Builds the structured Doctor Report model mirroring Single Metric Trends
 * with every non-zero biomarker grouped by clinical panel and a dedicated reference-range column.
 * Rows where every reading across all dates is missing or 0 are omitted.
 */
export function buildDoctorReportModel(
  reports: Report[],
  allSummaries: LatestResultSummary[],
  resultsCountByReport: Record<number, number> = {}
): DoctorReportModel {
  const reportsChronological = [...reports].sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  );

  const dateSet = new Set<string>();
  for (const r of reportsChronological) {
    if (r.reportDate) dateSet.add(r.reportDate);
  }
  for (const s of allSummaries) {
    for (const h of s.history || []) {
      if (h.reportDate) dateSet.add(h.reportDate);
    }
  }
  const uniqueDates = Array.from(dateSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const byCat = new Map<MetricCategory, DoctorReportRow[]>();
  const abnormalLatest: LatestResultSummary[] = [];
  let includedCount = 0;

  for (const summary of allSummaries) {
    const historyList =
      summary.history && summary.history.length > 0
        ? [...summary.history].sort(
            (a, b) =>
              new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
          )
        : [summary.latestResult];

    const readingsByDate: Record<string, ResultWithDate | undefined> = {};
    for (const h of historyList) {
      if (h.reportDate) {
        readingsByDate[h.reportDate] = h;
      }
    }

    // Omit rows where every value across all dates is missing (-) or 0
    const hasNonZeroReading = historyList.some(
      (h) => Number.isFinite(h.value) && h.value !== 0
    );
    if (!hasNonZeroReading) {
      continue;
    }

    includedCount += 1;
    if (summary.latestResult.flag !== "normal") {
      abnormalLatest.push(summary);
    }

    const dict = METRIC_DICTIONARY[summary.metricKey];
    const refLow = summary.latestResult.refLow ?? dict?.defaultLow;
    const refHigh = summary.latestResult.refHigh ?? dict?.defaultHigh;

    const row: DoctorReportRow = {
      metricKey: summary.metricKey,
      displayName: sanitizePdfText(summary.displayName),
      category: summary.category || "Other",
      referenceRange: formatDoctorReferenceRange(summary),
      refLow,
      refHigh,
      historySorted: historyList,
      readingsByDate,
    };

    const list = byCat.get(row.category) || [];
    list.push(row);
    byCat.set(row.category, list);
  }

  const panels: DoctorReportPanel[] = [];
  for (const p of PANEL_ORDER) {
    const rows = byCat.get(p.category);
    if (rows && rows.length > 0) {
      panels.push({
        category: p.category,
        title: p.title,
        rows: rows.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }
  }

  const generatedAt = new Date().toISOString().split("T")[0];
  return {
    generatedAt,
    generatedAtFormatted: formatDoctorDate(generatedAt),
    reportsChronological,
    uniqueDates,
    resultsCountByReport,
    totalMetrics: includedCount,
    abnormalLatest,
    panels,
  };
}

function getDotRgb(
  reading: ResultWithDate,
  refLow?: number,
  refHigh?: number
): [number, number, number] {
  const low = reading.refLow ?? refLow;
  const high = reading.refHigh ?? refHigh;
  if (reading.flag === "borderline") return [217, 119, 6]; // amber-600
  if (
    reading.flag === "high" ||
    reading.flag === "low" ||
    (high != null && reading.value > high) ||
    (low != null && reading.value < low)
  ) {
    return [220, 38, 38]; // red-600
  }
  return [16, 185, 129]; // emerald-500
}

/**
 * Renders a mini trend sparkline graph directly inside a jsPDF table cell,
 * matching the webapp's Single Metric Trends view (normal reference band + polyline + status dots).
 */
function drawTrendSparklineInCell(
  doc: any,
  cell: { x: number; y: number; width: number; height: number },
  row: DoctorReportRow
) {
  const history = row.historySorted;
  if (!history || history.length === 0) return;

  const padX = 2.6;
  const padY = 1.6;
  const boxX = cell.x + padX;
  const boxY = cell.y + padY;
  const boxW = Math.max(cell.width - padX * 2, 4);
  const boxH = Math.max(cell.height - padY * 2, 3);

  const values = history.map((h) => h.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const refLow = row.refLow;
  const refHigh = row.refHigh;

  const refSpan =
    refLow != null && refHigh != null && refHigh > refLow
      ? refHigh - refLow
      : refHigh
      ? refHigh * 0.5
      : refLow
      ? refLow * 0.5
      : maxVal - minVal || 1;

  const envMin = Math.min(minVal, refLow ?? minVal);
  const envMax = Math.max(maxVal, refHigh ?? maxVal);
  const fullSpan = Math.max(envMax - envMin, refSpan * 0.75, 0.0001);
  const yMin = envMin - fullSpan * 0.14;
  const yMax = envMax + fullSpan * 0.14;
  const ySpan = yMax - yMin;

  const toY = (v: number) => boxY + boxH - ((v - yMin) / ySpan) * boxH;

  // Normal range shaded band
  if (refLow != null && refHigh != null && refHigh > refLow) {
    const yTop = toY(refHigh);
    const yBot = toY(refLow);
    doc.setFillColor(220, 252, 231); // subtle emerald-100
    doc.rect(boxX, Math.min(yTop, yBot), boxW, Math.max(Math.abs(yBot - yTop), 0.6), "F");
  }

  if (history.length === 1) {
    const pt = history[0];
    const cy = toY(pt.value);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(boxX + 1, cy, boxX + boxW - 1, cy);

    const [r, g, b] = getDotRgb(pt, refLow, refHigh);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.2);
    doc.circle(boxX + boxW / 2, cy, 0.9, "FD");
    return;
  }

  const pts = history.map((pt, idx) => ({
    x: boxX + (idx / (history.length - 1)) * boxW,
    y: toY(pt.value),
    pt,
  }));

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.35);
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }

  for (const p of pts) {
    const [r, g, b] = getDotRgb(p.pt, refLow, refHigh);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.18);
    doc.circle(p.x, p.y, 0.78, "FD");
  }
}

async function loadLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface DoctorPdfExportOptions {
  profile?: UserProfile;
  accountEmail?: string;
}

/**
 * Generates a doctor-readable multi-page PDF report:
 * - Page 1: Gula cover page (brand, patient info, report summary, out-of-range highlights, source labs)
 * - Pages 2+: Single-metric longitudinal table with every test grouped by panel, dedicated Reference Range column, and Trend sparkline graph
 */
export async function generateDoctorReportPdfBlob(
  options: DoctorPdfExportOptions = {}
): Promise<{ blob: Blob; fileName: string; model: DoctorReportModel }> {
  const [{ jsPDF }, autoTableMod, dashboardData, countsMap] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    getDashboardData(),
    getResultsCountByReport(),
  ]);
  const autoTable = autoTableMod.default;

  const model = buildDoctorReportModel(
    dashboardData.reports,
    dashboardData.allSummaries,
    countsMap
  );

  if (model.totalMetrics === 0) {
    throw new Error("No non-zero biomarker results available to export.");
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const logoDataUrl = await loadLogoDataUrl();

  /* ==================================================================
   * PAGE 1: GULA COVER PAGE
   * ================================================================== */
  doc.setFillColor(255, 228, 239); // #FFE4EF
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setFillColor(236, 72, 153); // #EC4899 accent line
  doc.rect(0, 42, pageWidth, 1.4, "F");

  let titleStartX = marginX;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, 8, 24, 24);
      titleStartX = marginX + 29;
    } catch {
      titleStartX = marginX;
    }
  }

  doc.setTextColor(131, 24, 67);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17.5);
  doc.text("GULA : Blood Test Report Tracker & Analyzer", titleStartX, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(157, 23, 77);
  doc.text(
    "Physician-Ready Longitudinal Biomarker & Lab Report Summary",
    titleStartX,
    27
  );

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${model.generatedAtFormatted}`, pageWidth - marginX, 19, {
    align: "right",
  });
  doc.text(
    `${model.reportsChronological.length} Reports | ${model.totalMetrics} Tests`,
    pageWidth - marginX,
    26,
    { align: "right" }
  );

  const profile = options.profile;
  const bmi = profile ? computeBmi(profile.heightCm, profile.weightKg) : null;
  const boxTop = 50;
  const halfGap = 6;
  const halfWidth = (contentWidth - halfGap) / 2;

  // Card 1: Patient Information
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(marginX, boxTop, halfWidth, 48, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Patient Information", marginX + 5, boxTop + 8);

  const patientRows = [
    `Name: ${sanitizePdfText(profile?.fullName || "Not provided")}`,
    `Age / Sex: ${sanitizePdfText(profile?.age || "-")} yrs | ${sanitizePdfText(profile?.sex || "-")}`,
    `Blood Group: ${sanitizePdfText(profile?.bloodGroup || "-")}   BMI: ${bmi || "-"} (${sanitizePdfText(profile?.heightCm || "-")} cm / ${sanitizePdfText(profile?.weightKg || "-")} kg)`,
    `Notes: ${sanitizePdfText(profile?.conditions?.trim() || "-")}`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  let py = boxTop + 15;
  for (const line of patientRows) {
    const wrapped = doc.splitTextToSize(line, halfWidth - 10);
    doc.text(wrapped[0], marginX + 5, py);
    py += 6.5;
  }

  // Card 2: Out-of-Range Highlights
  const card2X = marginX + halfWidth + halfGap;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 248, 250);
  doc.roundedRect(card2X, boxTop, halfWidth, 48, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Latest Out-of-Range / Borderline Highlights (${model.abnormalLatest.length})`,
    card2X + 5,
    boxTop + 8
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  if (model.abnormalLatest.length === 0) {
    doc.setTextColor(16, 125, 80);
    doc.text(
      "All latest tracked biomarkers are within normal reference bounds.",
      card2X + 5,
      boxTop + 17
    );
  } else {
    let ay = boxTop + 15;
    for (const item of model.abnormalLatest.slice(0, 5)) {
      const flagTag = item.latestResult.flag.toUpperCase();
      const unitStr = sanitizePdfText(item.latestResult.unit || "");
      const line = `- ${sanitizePdfText(item.displayName)}: ${item.latestResult.value} ${unitStr} [${flagTag}] (Ref: ${formatDoctorReferenceRange(item)})`;
      doc.setTextColor(
        item.latestResult.flag === "borderline" ? 180 : 190,
        item.latestResult.flag === "borderline" ? 83 : 18,
        item.latestResult.flag === "borderline" ? 9 : 60
      );
      const clipped = doc.splitTextToSize(line, halfWidth - 10)[0];
      doc.text(clipped, card2X + 5, ay);
      ay += 6.2;
    }
    if (model.abnormalLatest.length > 5) {
      doc.setTextColor(100, 116, 139);
      doc.text(
        `+ ${model.abnormalLatest.length - 5} more flagged markers listed in tables on pages 2+`,
        card2X + 5,
        ay
      );
    }
  }

  // Table on Page 1: Included Lab Reports
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Included Laboratory Reports (Chronological)", marginX, 108);

  autoTable(doc, {
    startY: 112,
    margin: { left: marginX, right: marginX, bottom: 18 },
    head: [["Report Date", "Laboratory", "Tests Extracted"]],
    body: model.reportsChronological.map((rep) => [
      formatDoctorDate(rep.reportDate),
      sanitizePdfText(rep.labName || "Unknown lab"),
      String(rep.id ? model.resultsCountByReport[rep.id] ?? "-" : "-"),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 240, 246],
      textColor: [131, 24, 67],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Complete biomarker history across all panels with trend graphs and dedicated reference ranges follows on the next page.",
    marginX,
    pageHeight - 14
  );

  /* ==================================================================
   * PAGES 2+: ALL NON-ZERO TESTS WITH RANGE COLUMN & TREND SPARKLINE
   * ================================================================== */
  doc.addPage("a4", "landscape");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Complete Longitudinal Biomarker Table (All Panels)", marginX, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Tags: (H) High  |  (L) Low  |  (B) Borderline  |  Green zone in Trend graph shows normal reference band",
    marginX,
    20.5
  );

  const dateHeaders = model.uniqueDates.map((d) => formatDoctorDate(d));
  const totalCols = 3 + model.uniqueDates.length;
  const tableHead = [
    ["Biomarker / Test", "Reference Range", "Trend", ...dateHeaders],
  ];

  const tableBody: any[] = [];
  const readingMetaByBodyIndex = new Map<string, ResultWithDate>();
  const rowModelByBodyIndex = new Map<number, DoctorReportRow>();

  for (const panel of model.panels) {
    tableBody.push([
      {
        content: `${sanitizePdfText(panel.title)} (${panel.rows.length})`,
        colSpan: totalCols,
        styles: {
          fillColor: [255, 241, 247],
          textColor: [131, 24, 67],
          fontStyle: "bold",
          fontSize: 8.8,
          cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        },
      },
    ]);

    for (const row of panel.rows) {
      const rowIndex = tableBody.length;
      rowModelByBodyIndex.set(rowIndex, row);

      const dateCells = model.uniqueDates.map((d, dateIdx) => {
        const reading = row.readingsByDate[d];
        if (!reading || reading.value === 0) return "-";
        readingMetaByBodyIndex.set(`${rowIndex}:${3 + dateIdx}`, reading);
        const unit = sanitizePdfText(reading.unit || "");
        const flagTag =
          reading.flag === "high"
            ? " (H)"
            : reading.flag === "low"
            ? " (L)"
            : reading.flag === "borderline"
            ? " (B)"
            : "";
        return `${reading.value}${unit ? ` ${unit}` : ""}${flagTag}`;
      });

      // Trend column intentionally blank text; vector sparkline graph is drawn in didDrawCell
      tableBody.push([row.displayName, row.referenceRange, "", ...dateCells]);
    }
  }

  autoTable(doc, {
    startY: 24,
    margin: { left: marginX, right: marginX, top: 14, bottom: 15 },
    head: tableHead,
    body: tableBody,
    theme: "grid",
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1, 2],
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.2,
      minCellHeight: 8.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: "bold" },
      1: { cellWidth: 35, textColor: [71, 85, 105] },
      2: { cellWidth: 26, halign: "center" },
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      const reading = readingMetaByBodyIndex.get(
        `${data.row.index}:${data.column.index}`
      );
      if (!reading) return;
      if (reading.flag === "high" || reading.flag === "low") {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      } else if (reading.flag === "borderline") {
        data.cell.styles.fillColor = [255, 251, 235];
        data.cell.styles.textColor = [180, 83, 9];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 2) return;
      const row = rowModelByBodyIndex.get(data.row.index);
      if (!row) return;
      drawTrendSparklineInCell(doc, data.cell, row);
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 10.5, pageWidth - marginX, pageHeight - 10.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "GULA : Blood Test Report Tracker & Analyzer  |  For physician review alongside original lab PDFs. Not a medical diagnosis.",
      marginX,
      pageHeight - 6.2
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 6.2, {
      align: "right",
    });
  }

  const blob = doc.output("blob");
  const fileName = `gula-doctor-report-${model.generatedAt}.pdf`;
  return { blob, fileName, model };
}

/**
 * Triggers download of the generated Doctor Report PDF in browser / WebView.
 */
export async function exportDoctorReportPdf(
  options: DoctorPdfExportOptions = {}
): Promise<{ fileName: string; model: DoctorReportModel }> {
  const { blob, fileName, model } = await generateDoctorReportPdfBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { fileName, model };
}
