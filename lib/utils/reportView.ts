import {
  Report,
  ResultWithDate,
  LatestResultSummary,
  MetricCategory,
} from "../db/schema";
import { METRIC_DICTIONARY } from "../db/metricDictionary";

export const CATEGORY_ORDER: MetricCategory[] = [
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

export const CATEGORY_PANEL_NAMES: Record<string, string> = {
  Blood: "Complete Blood Count",
  Lipids: "Lipid Panel",
  Sugar: "Metabolic Panel",
  Thyroid: "Thyroid Panel",
  Liver: "Liver Function",
  Kidney: "Kidney Function",
  Vitamins: "Vitamins & Minerals",
  Hormones: "Hormone Panel",
  Other: "General Biomarkers",
};

export function cleanReportFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function getReportButtonLabel(report: Report, isLatest: boolean): string {
  if (isLatest) return "Latest report";
  if (report.labName && report.labName.trim()) return report.labName.trim();
  const cleaned = cleanReportFileName(report.fileName);
  return cleaned || "Previous report";
}

/**
 * Builds homepage card summaries scoped to a single `selectedReport`.
 *
 * Rules:
 * 1. Only biomarkers recorded in `selectedReport` are included.
 * 2. Comparison target for each metric:
 *    - Scan `activeReports` chronologically from newest (index 0) to oldest,
 *      skipping `selectedReport` itself.
 *    - Pick the first report that contains the same `metricKey`.
 *      -> When viewing the Latest report (index 0), this finds the 2nd latest
 *         report containing that test (or 3rd, etc. if missing in 2nd latest).
 *      -> When viewing any Previous report (index > 0), this finds the Latest
 *         report containing that test (or 2nd latest, etc. if missing in Latest).
 *      -> If the test does not exist in any other report, `previousResult` is
 *         undefined and `historyCount === 1` (so cards hide trend sparklines).
 * 3. `comparisonRelation`:
 *    - `"vs"` when the comparison report is strictly newer than `selectedReport`
 *    - `"since"` otherwise (comparing against an older or same-day report)
 */
export function buildReportScopedSummaries(
  selectedReport: Report,
  activeReports: Report[],
  resultsByReportId: Record<number, ResultWithDate[]>,
  allHistoryByMetric: Record<string, ResultWithDate[]>
): LatestResultSummary[] {
  if (!selectedReport || selectedReport.id == null) return [];

  const selectedResults = resultsByReportId[selectedReport.id] || [];
  if (selectedResults.length === 0) return [];

  // Build quick lookup: metricKey -> comparison ResultWithDate
  // Iterate reports newest -> oldest, skipping selectedReport
  const comparisonByMetric = new Map<string, ResultWithDate>();
  for (const report of activeReports) {
    if (report.id == null || report.id === selectedReport.id) continue;
    const reportResults = resultsByReportId[report.id];
    if (!reportResults) continue;
    for (const r of reportResults) {
      if (!comparisonByMetric.has(r.metricKey)) {
        comparisonByMetric.set(r.metricKey, r);
      }
    }
  }

  const seenMetricKeys = new Set<string>();
  const summaries: LatestResultSummary[] = [];
  const selectedTime = new Date(selectedReport.reportDate).getTime();

  for (const res of selectedResults) {
    if (seenMetricKeys.has(res.metricKey)) continue;
    seenMetricKeys.add(res.metricKey);

    const dictDef = METRIC_DICTIONARY[res.metricKey];
    const history = allHistoryByMetric[res.metricKey] || [res];
    const comparison = comparisonByMetric.get(res.metricKey);

    let changeValue: number | undefined;
    let changePercent: number | undefined;
    let comparisonRelation: "since" | "vs" | undefined;

    if (comparison) {
      changeValue = Number((res.value - comparison.value).toFixed(2));
      if (comparison.value !== 0) {
        changePercent = Number(
          (((res.value - comparison.value) / comparison.value) * 100).toFixed(1)
        );
      }
      const compTime = new Date(comparison.reportDate).getTime();
      comparisonRelation = compTime >= selectedTime ? "vs" : "since";
    }

    const sparklineValues = history.map((item) => item.value);

    summaries.push({
      metricKey: res.metricKey,
      displayName: dictDef?.displayName || res.displayName,
      category: dictDef?.category || res.category,
      standardUnit: dictDef?.standardUnit || res.unit,
      latestResult: res,
      previousResult: comparison,
      changeValue,
      changePercent,
      comparisonRelation,
      historyCount: history.length,
      sparklineValues,
      history,
    });
  }

  const flagWeight: Record<string, number> = {
    high: 3,
    low: 3,
    borderline: 2,
    normal: 1,
  };
  summaries.sort((a, b) => {
    const diff =
      (flagWeight[b.latestResult.flag] || 0) -
      (flagWeight[a.latestResult.flag] || 0);
    if (diff !== 0) return diff;
    return a.displayName.localeCompare(b.displayName);
  });

  return summaries;
}
