import Dexie, { type Table } from "dexie";
import {
  Report,
  Result,
  ResultWithDate,
  LatestResultSummary,
  SyncQueueItem,
  ReportStatus,
} from "./schema";
import { METRIC_DICTIONARY, evaluateResultFlag } from "./metricDictionary";
import type { CloudReport, CloudResult } from "../sync/types";

export const DB_NAME = "Gula_DB";
export const LEGACY_DB_NAME = "HealthTrack_V2_DB";

export class GulaDatabase extends Dexie {
  reports!: Table<Report, number>;
  results!: Table<Result, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      reports: "++id, reportDate, uploadedAt, status, fileName",
      results: "++id, reportId, metricKey, category, flag",
    });
    this.version(2).stores({
      reports: "++id, reportDate, uploadedAt, status, fileName, cloudId, userId, updatedAt",
      results: "++id, reportId, metricKey, category, flag, cloudId, reportCloudId, userId",
      syncQueue: "++id, entityType, entityId, action, createdAt",
    });
  }
}

// Backwards-compatible alias for existing code/tests
export const HealthTrackDatabase = GulaDatabase;

export const db = new GulaDatabase();

/**
 * Migrates data from legacy "HealthTrack_V2_DB" to "Gula_DB" if legacy DB exists,
 * ensuring existing installs and test data are not lost.
 */
export async function migrateFromLegacyDatabase(): Promise<{ migrated: boolean; count: number }> {
  if (typeof window === "undefined" && typeof indexedDB === "undefined") {
    return { migrated: false, count: 0 };
  }

  try {
    const legacyExists = await Dexie.exists(LEGACY_DB_NAME);
    if (!legacyExists) {
      return { migrated: false, count: 0 };
    }

    const legacyDb = new Dexie(LEGACY_DB_NAME);
    legacyDb.version(1).stores({
      reports: "++id, reportDate, uploadedAt, status, fileName",
      results: "++id, reportId, metricKey, category, flag",
    });
    legacyDb.version(2).stores({
      reports: "++id, reportDate, uploadedAt, status, fileName, cloudId, userId, updatedAt",
      results: "++id, reportId, metricKey, category, flag, cloudId, reportCloudId, userId",
      syncQueue: "++id, entityType, entityId, action, createdAt",
    });

    await legacyDb.open();
    const legacyReports = await legacyDb.table<Report, number>("reports").toArray();
    const legacyResults = await legacyDb.table<Result, number>("results").toArray();
    const legacySyncQueue = await legacyDb.table<SyncQueueItem, number>("syncQueue").toArray();

    let migratedCount = 0;
    if (legacyReports.length > 0 || legacyResults.length > 0) {
      await db.open();
      const currentReportsCount = await db.reports.count();

      if (currentReportsCount === 0) {
        await db.transaction("rw", db.reports, db.results, db.syncQueue, async () => {
          if (legacyReports.length > 0) {
            await db.reports.bulkAdd(legacyReports);
          }
          if (legacyResults.length > 0) {
            await db.results.bulkAdd(legacyResults);
          }
          if (legacySyncQueue.length > 0) {
            await db.syncQueue.bulkAdd(legacySyncQueue);
          }
        });
        migratedCount = legacyReports.length;
      }
    }

    legacyDb.close();
    return { migrated: true, count: migratedCount };
  } catch (err) {
    console.warn("Legacy database migration skipped/failed:", err);
    return { migrated: false, count: 0 };
  }
}

/**
 * 1. addReport: saves report and all associated test results in an atomic transaction
 */
export async function addReport(
  reportData: Omit<Report, "id">,
  resultsData: Omit<Result, "id" | "reportId">[]
): Promise<number> {
  return await db.transaction("rw", db.reports, db.results, async () => {
    const now = Date.now();
    const reportId = await db.reports.add({
      ...reportData,
      status: reportData.status || "active",
      uploadedAt: reportData.uploadedAt || now,
      updatedAt: reportData.updatedAt || now,
      parseWarnings: reportData.parseWarnings || [],
    });

    const recordsToInsert: Result[] = resultsData.map((res) => ({
      ...res,
      reportId,
      updatedAt: res.updatedAt || now,
    }));

    await db.results.bulkAdd(recordsToInsert);
    return reportId;
  });
}

/**
 * 2. getActiveReports: retrieves all active reports ordered chronologically descending by reportDate
 */
export async function getActiveReports(): Promise<Report[]> {
  const activeReports = await db.reports
    .where("status")
    .equals("active")
    .toArray();

  return activeReports.sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  );
}

/**
 * 3. getLatestResults: returns latest reading per metricKey across all active reports
 * Includes previous result, change value, and change percent.
 */
export async function getLatestResults(): Promise<LatestResultSummary[]> {
  const activeReports = await getActiveReports();
  if (activeReports.length === 0) return [];

  const activeReportIds = new Set(activeReports.map((r) => r.id!));
  const reportMap = new Map(activeReports.map((r) => [r.id!, r]));

  // Get all results belonging to active reports
  const allResults = await db.results.toArray();
  const activeResults = allResults.filter((r) => activeReportIds.has(r.reportId));

  // Group by metricKey
  const grouped = new Map<string, ResultWithDate[]>();
  for (const res of activeResults) {
    const report = reportMap.get(res.reportId)!;
    const resWithDate: ResultWithDate = {
      ...res,
      reportDate: report.reportDate,
      fileName: report.fileName,
    };

    if (!grouped.has(res.metricKey)) {
      grouped.set(res.metricKey, []);
    }
    grouped.get(res.metricKey)!.push(resWithDate);
  }

  const summaries: LatestResultSummary[] = [];

  for (const [metricKey, items] of grouped.entries()) {
    // Sort descending by reportDate to get latest first
    items.sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );

    const latest = items[0];
    const previous = items.length > 1 ? items[1] : undefined;

    let changeValue: number | undefined;
    let changePercent: number | undefined;

    if (previous && previous.value !== 0) {
      changeValue = Number((latest.value - previous.value).toFixed(2));
      changePercent = Number(
        (((latest.value - previous.value) / previous.value) * 100).toFixed(1)
      );
    }

    const dictDef = METRIC_DICTIONARY[metricKey];

    // Chronological ascending items for sparkline and trends
    const chronologicalItems = [...items].sort(
      (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );
    const sparklineValues = chronologicalItems.map((item) => item.value);

    summaries.push({
      metricKey,
      displayName: dictDef?.displayName || latest.displayName,
      category: dictDef?.category || latest.category,
      standardUnit: dictDef?.standardUnit || latest.unit,
      latestResult: latest,
      previousResult: previous,
      changeValue,
      changePercent,
      historyCount: items.length,
      sparklineValues,
      history: chronologicalItems,
    });
  }

  // Sort summaries: abnormal first (high/low), then borderline, then normal
  const flagWeight = { high: 3, low: 3, borderline: 2, normal: 1 };
  summaries.sort((a, b) => {
    const diff =
      (flagWeight[b.latestResult.flag] || 0) -
      (flagWeight[a.latestResult.flag] || 0);
    if (diff !== 0) return diff;
    return a.displayName.localeCompare(b.displayName);
  });

  return summaries;
}

/**
 * 4. getHistory: returns chronological ascending results for a specific metricKey from active reports
 */
export async function getHistory(metricKey: string): Promise<ResultWithDate[]> {
  const activeReports = await getActiveReports();
  if (activeReports.length === 0) return [];

  const activeReportMap = new Map(activeReports.map((r) => [r.id!, r]));

  const matchingResults = await db.results
    .where("metricKey")
    .equals(metricKey)
    .toArray();

  const activeMatching: ResultWithDate[] = [];
  for (const res of matchingResults) {
    const report = activeReportMap.get(res.reportId);
    if (report) {
      activeMatching.push({
        ...res,
        reportDate: report.reportDate,
        fileName: report.fileName,
      });
    }
  }

  // Chronological ascending sort (oldest to newest) for line charts
  return activeMatching.sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  );
}

/**
 * 5. undoLastUpload: soft-deletes the most recently uploaded active report by setting status = "undone"
 */
export async function undoLastUpload(): Promise<Report | null> {
  return await db.transaction("rw", db.reports, async () => {
    const activeReports = await db.reports
      .where("status")
      .equals("active")
      .toArray();

    if (activeReports.length === 0) return null;

    // Find the one with highest uploadedAt timestamp
    activeReports.sort((a, b) => b.uploadedAt - a.uploadedAt);
    const lastUploaded = activeReports[0];

    const now = Date.now();
    await db.reports.update(lastUploaded.id!, { status: "undone", updatedAt: now });
    lastUploaded.status = "undone";
    lastUploaded.updatedAt = now;
    return lastUploaded;
  });
}

/**
 * 6. restoreUndone: restores the most recently undone report back to status = "active"
 */
export async function restoreUndone(): Promise<Report | null> {
  return await db.transaction("rw", db.reports, async () => {
    const undoneReports = await db.reports
      .where("status")
      .equals("undone")
      .toArray();

    if (undoneReports.length === 0) return null;

    // Find the one with highest uploadedAt timestamp
    undoneReports.sort((a, b) => b.uploadedAt - a.uploadedAt);
    const lastUndone = undoneReports[0];

    const now = Date.now();
    await db.reports.update(lastUndone.id!, { status: "active", updatedAt: now });
    lastUndone.status = "active";
    lastUndone.updatedAt = now;
    return lastUndone;
  });
}

/**
 * 7. deleteAllData: completely wipes all reports and results
 */
export async function deleteAllData(): Promise<void> {
  await db.transaction("rw", db.reports, db.results, async () => {
    await db.results.clear();
    await db.reports.clear();
  });
}

/**
 * 8. loadDemoData: seeds realistic clinical reports with longitudinal history
 */
export async function loadDemoData(): Promise<void> {
  await deleteAllData();

  // Helper to create a dummy PDF fileBlob
  const createMockPdfBlob = (name: string) =>
    new Blob([`%PDF-1.4 Mock PDF Content for ${name}`], {
      type: "application/pdf",
    });

  // Report 1: 10 months ago
  const rep1: Omit<Report, "id"> = {
    fileName: "Quest_Annual_Apr2024.pdf",
    labName: "Quest Diagnostics",
    reportDate: "2024-04-15",
    uploadedAt: Date.now() - 300 * 24 * 3600 * 1000,
    status: "active",
    fileBlob: createMockPdfBlob("Quest_Annual_Apr2024"),
    parseWarnings: [],
  };

  const res1: Omit<Result, "id" | "reportId">[] = [
    { metricKey: "glucose_fasting", displayName: "Fasting Blood Glucose", value: 104, unit: "mg/dL", refLow: 70, refHigh: 99, flag: "borderline", category: "Sugar" },
    { metricKey: "hba1c", displayName: "Hemoglobin A1c", value: 5.9, unit: "%", refLow: 4.0, refHigh: 5.6, flag: "borderline", category: "Sugar" },
    { metricKey: "cholesterol_total", displayName: "Total Cholesterol", value: 215, unit: "mg/dL", refLow: 125, refHigh: 199, flag: "high", category: "Lipids" },
    { metricKey: "hdl", displayName: "HDL Cholesterol", value: 42, unit: "mg/dL", refLow: 40, refHigh: 80, flag: "normal", category: "Lipids" },
    { metricKey: "ldl", displayName: "LDL Cholesterol", value: 142, unit: "mg/dL", refLow: 50, refHigh: 99, flag: "high", category: "Lipids" },
    { metricKey: "triglycerides", displayName: "Triglycerides", value: 185, unit: "mg/dL", refLow: 0, refHigh: 149, flag: "high", category: "Lipids" },
    { metricKey: "hemoglobin", displayName: "Hemoglobin", value: 14.8, unit: "g/dL", refLow: 13.5, refHigh: 17.5, flag: "normal", category: "Blood" },
    { metricKey: "wbc", displayName: "White Blood Cell Count", value: 6.8, unit: "K/uL", refLow: 4.5, refHigh: 11.0, flag: "normal", category: "Blood" },
    { metricKey: "platelets", displayName: "Platelet Count", value: 240, unit: "K/uL", refLow: 150, refHigh: 450, flag: "normal", category: "Blood" },
    { metricKey: "tsh", displayName: "Thyroid Stimulating Hormone (TSH)", value: 3.1, unit: "uIU/mL", refLow: 0.4, refHigh: 4.0, flag: "normal", category: "Thyroid" },
    { metricKey: "alt", displayName: "Alanine Aminotransferase (ALT/SGPT)", value: 48, unit: "U/L", refLow: 7, refHigh: 55, flag: "normal", category: "Liver" },
    { metricKey: "creatinine", displayName: "Serum Creatinine", value: 1.05, unit: "mg/dL", refLow: 0.7, refHigh: 1.3, flag: "normal", category: "Kidney" },
    { metricKey: "egfr", displayName: "Estimated GFR (eGFR)", value: 92, unit: "mL/min/1.73m2", refLow: 60, refHigh: 120, flag: "normal", category: "Kidney" },
    { metricKey: "vitamin_d", displayName: "Vitamin D (25-OH)", value: 22, unit: "ng/mL", refLow: 30, refHigh: 100, flag: "borderline", category: "Vitamins" },
    { metricKey: "vitamin_b12", displayName: "Vitamin B12", value: 340, unit: "pg/mL", refLow: 200, refHigh: 900, flag: "normal", category: "Vitamins" },
  ];

  await addReport(rep1, res1);

  // Report 2: 5 months ago
  const rep2: Omit<Report, "id"> = {
    fileName: "Labcorp_Followup_Oct2024.pdf",
    labName: "Labcorp",
    reportDate: "2024-10-10",
    uploadedAt: Date.now() - 150 * 24 * 3600 * 1000,
    status: "active",
    fileBlob: createMockPdfBlob("Labcorp_Followup_Oct2024"),
    parseWarnings: [],
  };

  const res2: Omit<Result, "id" | "reportId">[] = [
    { metricKey: "glucose_fasting", displayName: "Fasting Blood Glucose", value: 96, unit: "mg/dL", refLow: 70, refHigh: 99, flag: "normal", category: "Sugar" },
    { metricKey: "hba1c", displayName: "Hemoglobin A1c", value: 5.6, unit: "%", refLow: 4.0, refHigh: 5.6, flag: "normal", category: "Sugar" },
    { metricKey: "cholesterol_total", displayName: "Total Cholesterol", value: 192, unit: "mg/dL", refLow: 125, refHigh: 199, flag: "normal", category: "Lipids" },
    { metricKey: "hdl", displayName: "HDL Cholesterol", value: 47, unit: "mg/dL", refLow: 40, refHigh: 80, flag: "normal", category: "Lipids" },
    { metricKey: "ldl", displayName: "LDL Cholesterol", value: 118, unit: "mg/dL", refLow: 50, refHigh: 99, flag: "borderline", category: "Lipids" },
    { metricKey: "triglycerides", displayName: "Triglycerides", value: 145, unit: "mg/dL", refLow: 0, refHigh: 149, flag: "normal", category: "Lipids" },
    { metricKey: "alt", displayName: "Alanine Aminotransferase (ALT/SGPT)", value: 34, unit: "U/L", refLow: 7, refHigh: 55, flag: "normal", category: "Liver" },
    { metricKey: "creatinine", displayName: "Serum Creatinine", value: 0.98, unit: "mg/dL", refLow: 0.7, refHigh: 1.3, flag: "normal", category: "Kidney" },
    { metricKey: "vitamin_d", displayName: "Vitamin D (25-OH)", value: 38, unit: "ng/mL", refLow: 30, refHigh: 100, flag: "normal", category: "Vitamins" },
  ];

  await addReport(rep2, res2);

  // Report 3: 1 month ago
  const rep3: Omit<Report, "id"> = {
    fileName: "Quest_Checkup_Jan2025.pdf",
    labName: "Quest Diagnostics",
    reportDate: "2025-01-20",
    uploadedAt: Date.now() - 30 * 24 * 3600 * 1000,
    status: "active",
    fileBlob: createMockPdfBlob("Quest_Checkup_Jan2025"),
    parseWarnings: [],
  };

  const res3: Omit<Result, "id" | "reportId">[] = [
    { metricKey: "glucose_fasting", displayName: "Fasting Blood Glucose", value: 91, unit: "mg/dL", refLow: 70, refHigh: 99, flag: "normal", category: "Sugar" },
    { metricKey: "hba1c", displayName: "Hemoglobin A1c", value: 5.3, unit: "%", refLow: 4.0, refHigh: 5.6, flag: "normal", category: "Sugar" },
    { metricKey: "cholesterol_total", displayName: "Total Cholesterol", value: 174, unit: "mg/dL", refLow: 125, refHigh: 199, flag: "normal", category: "Lipids" },
    { metricKey: "hdl", displayName: "HDL Cholesterol", value: 54, unit: "mg/dL", refLow: 40, refHigh: 80, flag: "normal", category: "Lipids" },
    { metricKey: "ldl", displayName: "LDL Cholesterol", value: 94, unit: "mg/dL", refLow: 50, refHigh: 99, flag: "normal", category: "Lipids" },
    { metricKey: "triglycerides", displayName: "Triglycerides", value: 118, unit: "mg/dL", refLow: 0, refHigh: 149, flag: "normal", category: "Lipids" },
    { metricKey: "hemoglobin", displayName: "Hemoglobin", value: 15.3, unit: "g/dL", refLow: 13.5, refHigh: 17.5, flag: "normal", category: "Blood" },
    { metricKey: "wbc", displayName: "White Blood Cell Count", value: 6.1, unit: "K/uL", refLow: 4.5, refHigh: 11.0, flag: "normal", category: "Blood" },
    { metricKey: "platelets", displayName: "Platelet Count", value: 260, unit: "K/uL", refLow: 150, refHigh: 450, flag: "normal", category: "Blood" },
    { metricKey: "tsh", displayName: "Thyroid Stimulating Hormone (TSH)", value: 2.2, unit: "uIU/mL", refLow: 0.4, refHigh: 4.0, flag: "normal", category: "Thyroid" },
    { metricKey: "alt", displayName: "Alanine Aminotransferase (ALT/SGPT)", value: 25, unit: "U/L", refLow: 7, refHigh: 55, flag: "normal", category: "Liver" },
    { metricKey: "creatinine", displayName: "Serum Creatinine", value: 0.92, unit: "mg/dL", refLow: 0.7, refHigh: 1.3, flag: "normal", category: "Kidney" },
    { metricKey: "egfr", displayName: "Estimated GFR (eGFR)", value: 99, unit: "mL/min/1.73m2", refLow: 60, refHigh: 120, flag: "normal", category: "Kidney" },
    { metricKey: "vitamin_d", displayName: "Vitamin D (25-OH)", value: 46, unit: "ng/mL", refLow: 30, refHigh: 100, flag: "normal", category: "Vitamins" },
    { metricKey: "vitamin_b12", displayName: "Vitamin B12", value: 490, unit: "pg/mL", refLow: 200, refHigh: 900, flag: "normal", category: "Vitamins" },
    { metricKey: "calcium", displayName: "Serum Calcium", value: 9.6, unit: "mg/dL", refLow: 8.5, refHigh: 10.5, flag: "normal", category: "Other" },
  ];

  await addReport(rep3, res3);
}

/**
 * 9. getUndoneReports: returns all reports marked as "undone"
 */
export async function getUndoneReports(): Promise<Report[]> {
  const undoneReports = await db.reports
    .where("status")
    .equals("undone")
    .toArray();

  return undoneReports.sort(
    (a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0)
  );
}

/**
 * 10. restoreReport: restores a specific undone report by id
 */
export async function restoreReport(reportId: number): Promise<boolean> {
  return await db.transaction("rw", db.reports, async () => {
    const report = await db.reports.get(reportId);
    if (!report) return false;
    await db.reports.update(reportId, { status: "active", updatedAt: Date.now() });
    return true;
  });
}

/**
 * 11. deleteReportPermanently: permanently deletes a report and all its results
 */
export async function deleteReportPermanently(reportId: number): Promise<void> {
  await db.transaction("rw", db.reports, db.results, async () => {
    await db.results.where("reportId").equals(reportId).delete();
    await db.reports.delete(reportId);
  });
}

/**
 * 12. getResultsCountByReport: returns mapping of reportId to count of results
 */
export async function getResultsCountByReport(): Promise<Record<number, number>> {
  const allResults = await db.results.toArray();
  const map: Record<number, number> = {};
  for (const r of allResults) {
    map[r.reportId] = (map[r.reportId] || 0) + 1;
  }
  return map;
}

/**
 * 13. exportAllDataAsJson: exports all reports and results as formatted JSON
 */
export async function exportAllDataAsJson(): Promise<string> {
  const reports = await db.reports.toArray();
  const results = await db.results.toArray();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    reports: reports.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      labName: r.labName,
      reportDate: r.reportDate,
      uploadedAt: r.uploadedAt,
      status: r.status,
      parseWarnings: r.parseWarnings,
    })),
    results: results.map((res) => ({
      id: res.id,
      reportId: res.reportId,
      metricKey: res.metricKey,
      displayName: res.displayName,
      value: res.value,
      unit: res.unit,
      refLow: res.refLow,
      refHigh: res.refHigh,
      flag: res.flag,
      category: res.category,
    })),
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * 14. exportAllDataAsCsv: exports all biomarker results with report metadata as CSV
 */
export async function exportAllDataAsCsv(): Promise<string> {
  const reports = await db.reports.toArray();
  const results = await db.results.toArray();
  const reportMap = new Map(reports.map((r) => [r.id!, r]));

  const headers = [
    "Report Date",
    "Lab Name",
    "File Name",
    "Test Name",
    "Metric Key",
    "Category",
    "Value",
    "Unit",
    "Ref Low",
    "Ref High",
    "Status Flag",
  ];

  const rows = results.map((res) => {
    const rep = reportMap.get(res.reportId);
    return [
      rep ? rep.reportDate : "",
      rep ? `"${(rep.labName || "").replace(/"/g, '""')}"` : "",
      rep ? `"${(rep.fileName || "").replace(/"/g, '""')}"` : "",
      `"${res.displayName.replace(/"/g, '""')}"`,
      res.metricKey,
      res.category,
      res.value,
      `"${res.unit.replace(/"/g, '""')}"`,
      res.refLow !== undefined ? res.refLow : "",
      res.refHigh !== undefined ? res.refHigh : "",
      res.flag,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/* ==================================================================
 * PHASE 8: LOCAL-FIRST CLOUD SYNC HELPERS
 * ================================================================== */

/**
 * 15. getUnsyncedReports: returns local reports that are new or updated since last sync
 */
export async function getUnsyncedReports(userId?: string): Promise<Report[]> {
  const allReports = await db.reports.toArray();
  return allReports.filter((r) => {
    if (userId && r.userId && r.userId !== userId) return false;
    if (!r.cloudId) return true;
    if (r.updatedAt && (!r.syncedAt || r.syncedAt < r.updatedAt)) return true;
    return false;
  });
}

/**
 * 16. getUnsyncedResults: returns local biomarker results that have not been uploaded to cloud
 */
export async function getUnsyncedResults(userId?: string): Promise<Result[]> {
  const allResults = await db.results.toArray();
  return allResults.filter((r) => {
    if (userId && r.userId && r.userId !== userId) return false;
    return !r.cloudId;
  });
}

/**
 * 17. markReportSynced: updates local report with its cloud UUID and sync timestamp
 */
export async function markReportSynced(
  localId: number,
  cloudId: string,
  pdfStoragePath?: string,
  pdfSynced?: boolean
): Promise<void> {
  await db.reports.update(localId, {
    cloudId,
    syncedAt: Date.now(),
    ...(pdfStoragePath ? { pdfStoragePath } : {}),
    ...(pdfSynced !== undefined ? { pdfSynced } : {}),
  });
}

/**
 * 18. markResultSynced: updates local result with its cloud UUID
 */
export async function markResultSynced(
  localId: number,
  cloudId: string,
  reportCloudId?: string
): Promise<void> {
  await db.results.update(localId, {
    cloudId,
    ...(reportCloudId ? { reportCloudId } : {}),
  });
}

/**
 * 19. updateReportStatusFromCloud: syncs Undo/Restore status from another device
 */
export async function updateReportStatusFromCloud(
  cloudId: string,
  status: ReportStatus,
  remoteUpdatedAt: number
): Promise<boolean> {
  const report = await db.reports.filter((r) => r.cloudId === cloudId).first();
  if (!report || !report.id) return false;

  // Conflict resolution: Last-Write-Wins (LWW)
  if ((report.updatedAt || 0) < remoteUpdatedAt) {
    await db.reports.update(report.id, {
      status,
      updatedAt: remoteUpdatedAt,
    });
    return true;
  }
  return false;
}

/**
 * 20. upsertReportFromCloud: merges a report and its results downloaded from the cloud
 */
export async function upsertReportFromCloud(
  cloudReport: CloudReport,
  cloudResults: CloudResult[]
): Promise<number> {
  return await db.transaction("rw", db.reports, db.results, async () => {
    // Check if report already exists locally by cloudId or identical file + date
    let localReport = await db.reports
      .filter((r) => r.cloudId === cloudReport.id)
      .first();

    if (!localReport) {
      localReport = await db.reports
        .filter(
          (r) =>
            r.fileName === cloudReport.file_name &&
            r.reportDate === cloudReport.report_date
        )
        .first();
    }

    const updatedAtTimestamp = new Date(cloudReport.updated_at).getTime() || Date.now();

    if (localReport && localReport.id) {
      // Conflict resolution: update if remote has newer or equal timestamp
      if ((localReport.updatedAt || 0) <= updatedAtTimestamp) {
        await db.reports.update(localReport.id, {
          cloudId: cloudReport.id,
          userId: cloudReport.user_id,
          status: cloudReport.status,
          labName: cloudReport.lab_name || localReport.labName,
          pdfStoragePath: cloudReport.pdf_storage_path || localReport.pdfStoragePath,
          updatedAt: updatedAtTimestamp,
          syncedAt: Date.now(),
        });
      }
      return localReport.id;
    }

    // Insert as new local report
    const newReportId = await db.reports.add({
      fileName: cloudReport.file_name,
      labName: cloudReport.lab_name || undefined,
      reportDate: cloudReport.report_date,
      uploadedAt: cloudReport.uploaded_at,
      status: cloudReport.status,
      parseWarnings: cloudReport.parse_warnings || [],
      cloudId: cloudReport.id,
      userId: cloudReport.user_id,
      pdfStoragePath: cloudReport.pdf_storage_path || undefined,
      pdfSynced: !!cloudReport.pdf_storage_path,
      syncedAt: Date.now(),
      updatedAt: updatedAtTimestamp,
    });

    // Insert associated results
    const resultsToInsert: Result[] = cloudResults.map((cr) => ({
      reportId: newReportId,
      metricKey: cr.metric_key,
      displayName: cr.display_name,
      value: cr.value,
      unit: cr.unit,
      refLow: cr.ref_low !== null ? cr.ref_low : undefined,
      refHigh: cr.ref_high !== null ? cr.ref_high : undefined,
      flag: cr.flag,
      category: cr.category,
      cloudId: cr.id,
      reportCloudId: cloudReport.id,
      userId: cr.user_id,
      updatedAt: updatedAtTimestamp,
    }));

    if (resultsToInsert.length > 0) {
      await db.results.bulkAdd(resultsToInsert);
    }

    return newReportId;
  });
}

/**
 * 21. linkLocalDataToUser: links local offline records to a user account on first sign-in merge
 */
export async function linkLocalDataToUser(userId: string): Promise<void> {
  await db.transaction("rw", db.reports, db.results, async () => {
    const reports = await db.reports.toArray();
    for (const r of reports) {
      if (r.id) {
        await db.reports.update(r.id, { userId });
      }
    }
    const results = await db.results.toArray();
    for (const res of results) {
      if (res.id) {
        await db.results.update(res.id, { userId });
      }
    }
  });
}

/**
 * 22. clearLocalDataKeepAccount: clears all local tables when user chooses "Start fresh"
 */
export async function clearLocalDataKeepAccount(): Promise<void> {
  await deleteAllData();
}

/**
 * 23. queueSyncItem: records an offline sync mutation
 */
export async function queueSyncItem(
  item: Omit<SyncQueueItem, "id">
): Promise<number> {
  return await db.syncQueue.add({
    ...item,
    createdAt: item.createdAt || Date.now(),
    retryCount: item.retryCount || 0,
  });
}

/**
 * 24. getSyncQueue: retrieves pending sync items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return await db.syncQueue.toArray();
}

/**
 * 25. removeSyncQueueItem: removes processed sync queue entry
 */
export async function removeSyncQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

