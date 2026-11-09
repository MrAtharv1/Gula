import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import {
  db,
  DB_NAME,
  LEGACY_DB_NAME,
  migrateFromLegacyDatabase,
  deleteAllData,
  getActiveReports,
} from "@/lib/db";

describe("IndexedDB Database Name and Migration", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("uses the new database name 'Gula_DB'", () => {
    expect(db.name).toBe("Gula_DB");
    expect(DB_NAME).toBe("Gula_DB");
    expect(LEGACY_DB_NAME).toBe("HealthTrack_V2_DB");
  });

  it("migrates existing reports and results from HealthTrack_V2_DB without data loss", async () => {
    // 1. Simulate an existing install having data in HealthTrack_V2_DB
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
    const legacyReportId = await legacyDb.table("reports").add({
      fileName: "annual_checkup_2024.pdf",
      labName: "Dr Lal PathLabs",
      reportDate: "2024-05-10",
      uploadedAt: 1715300000000,
      status: "active",
      parseWarnings: [],
    });

    await legacyDb.table("results").add({
      reportId: legacyReportId,
      metricKey: "hemoglobin",
      displayName: "Hemoglobin",
      value: 14.8,
      unit: "g/dL",
      refLow: 13.0,
      refHigh: 17.0,
      flag: "normal",
      category: "Blood",
    });

    legacyDb.close();

    // 2. Ensure destination Gula_DB is currently empty
    const beforeReports = await getActiveReports();
    expect(beforeReports.length).toBe(0);

    // 3. Execute migration
    const migrationResult = await migrateFromLegacyDatabase();
    expect(migrationResult.migrated).toBe(true);
    expect(migrationResult.count).toBe(1);

    // 4. Verify Gula_DB now contains the migrated report and results
    const afterReports = await getActiveReports();
    expect(afterReports.length).toBe(1);
    expect(afterReports[0].fileName).toBe("annual_checkup_2024.pdf");
    expect(afterReports[0].reportDate).toBe("2024-05-10");

    const afterResults = await db.results.where("reportId").equals(afterReports[0].id!).toArray();
    expect(afterResults.length).toBe(1);
    expect(afterResults[0].metricKey).toBe("hemoglobin");
    expect(afterResults[0].value).toBe(14.8);
  });
});
