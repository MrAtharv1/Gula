import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "fake-indexeddb/auto";
import {
  db,
  addReport,
  getActiveReports,
  getUndoneReports,
  undoLastUpload,
  restoreUndone,
  restoreReport,
  deleteReportPermanently,
  deleteAllData,
  exportAllDataAsJson,
  exportAllDataAsCsv,
} from "@/lib/db";
import { usePreferenceStore } from "@/lib/store/preferenceStore";
import { SettingsView } from "@/components/SettingsView";
import { Report, Result } from "@/lib/db/schema";

describe("Phase 6: Settings and Undo Engine", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  const createDummyReport = (name: string, date: string, uploadedOffsetMinutes: number) => ({
    fileName: name,
    labName: "Diagnostic Lab",
    reportDate: date,
    uploadedAt: Date.now() + uploadedOffsetMinutes * 60 * 1000,
    status: "active" as const,
    fileBlob: new Blob(["dummy pdf"], { type: "application/pdf" }),
    parseWarnings: [],
  });

  const dummyResults = (val: number): Omit<Result, "id" | "reportId">[] => [
    {
      metricKey: "glucose_fasting",
      displayName: "Fasting Glucose",
      value: val,
      unit: "mg/dL",
      refLow: 70,
      refHigh: 99,
      flag: val > 99 ? "high" : "normal",
      category: "Sugar",
    },
  ];

  describe("Undo and Restore Repository Operations", () => {
    it("undoes the most recent upload and reverts active state", async () => {
      // 1. Upload Report 1 (older)
      const id1 = await addReport(
        createDummyReport("Report_1_Oct2023.pdf", "2023-10-10", 0),
        dummyResults(92)
      );

      // 2. Upload Report 2 (newer)
      const id2 = await addReport(
        createDummyReport("Report_2_Apr2024.pdf", "2024-04-15", 5),
        dummyResults(104)
      );

      let active = await getActiveReports();
      expect(active.length).toBe(2);

      // 3. Undo last upload
      const undone = await undoLastUpload();
      expect(undone?.fileName).toBe("Report_2_Apr2024.pdf");
      expect(undone?.status).toBe("undone");

      // Verify active reports only contains Report 1
      active = await getActiveReports();
      expect(active.length).toBe(1);
      expect(active[0].fileName).toBe("Report_1_Oct2023.pdf");

      // Verify undone reports contains Report 2
      const undoneList = await getUndoneReports();
      expect(undoneList.length).toBe(1);
      expect(undoneList[0].fileName).toBe("Report_2_Apr2024.pdf");
    });

    it("supports repeated undo to step back multiple uploads", async () => {
      await addReport(createDummyReport("Report_1.pdf", "2023-01-01", 1), dummyResults(90));
      await addReport(createDummyReport("Report_2.pdf", "2023-06-01", 2), dummyResults(95));
      await addReport(createDummyReport("Report_3.pdf", "2024-01-01", 3), dummyResults(100));

      expect((await getActiveReports()).length).toBe(3);

      // First undo: removes Report 3
      const u1 = await undoLastUpload();
      expect(u1?.fileName).toBe("Report_3.pdf");
      expect((await getActiveReports()).length).toBe(2);

      // Second undo: removes Report 2
      const u2 = await undoLastUpload();
      expect(u2?.fileName).toBe("Report_2.pdf");
      expect((await getActiveReports()).length).toBe(1);
      expect((await getActiveReports())[0].fileName).toBe("Report_1.pdf");
    });

    it("restores undone report back to active", async () => {
      await addReport(createDummyReport("Report_1.pdf", "2023-01-01", 1), dummyResults(90));
      await addReport(createDummyReport("Report_2.pdf", "2023-06-01", 2), dummyResults(95));

      await undoLastUpload();
      expect((await getActiveReports()).length).toBe(1);

      // Restore undone
      const restored = await restoreUndone();
      expect(restored?.fileName).toBe("Report_2.pdf");
      expect(restored?.status).toBe("active");

      const active = await getActiveReports();
      expect(active.length).toBe(2);
    });

    it("permanently deletes a report and all its test results", async () => {
      const repId = await addReport(
        createDummyReport("Temporary.pdf", "2024-01-01", 1),
        dummyResults(90)
      );

      const beforeResults = await db.results.where("reportId").equals(repId).toArray();
      expect(beforeResults.length).toBe(1);

      await deleteReportPermanently(repId);

      const afterRep = await db.reports.get(repId);
      expect(afterRep).toBeUndefined();

      const afterResults = await db.results.where("reportId").equals(repId).toArray();
      expect(afterResults.length).toBe(0);
    });
  });

  describe("Data Export Functions", () => {
    it("exports all reports and results as valid JSON", async () => {
      await addReport(createDummyReport("ExportTest.pdf", "2024-02-15", 1), dummyResults(95));

      const jsonStr = await exportAllDataAsJson();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.version).toBe(1);
      expect(parsed.reports.length).toBe(1);
      expect(parsed.reports[0].fileName).toBe("ExportTest.pdf");
      expect(parsed.results.length).toBe(1);
      expect(parsed.results[0].metricKey).toBe("glucose_fasting");
    });

    it("exports all results as CSV with standard headers", async () => {
      await addReport(createDummyReport("CsvTest.pdf", "2024-02-15", 1), dummyResults(95));

      const csvStr = await exportAllDataAsCsv();
      const lines = csvStr.split("\n");

      expect(lines[0]).toContain("Report Date,Lab Name,File Name,Test Name");
      expect(lines[1]).toContain("2024-02-15");
      expect(lines[1]).toContain("CsvTest.pdf");
      expect(lines[1]).toContain("Fasting Glucose");
    });
  });

  describe("Units Preference Store", () => {
    it("updates glucose and cholesterol unit preferences", () => {
      const store = usePreferenceStore.getState();
      expect(store.glucoseUnit).toBe("mg/dL");

      store.setGlucoseUnit("mmol/L");
      expect(usePreferenceStore.getState().glucoseUnit).toBe("mmol/L");

      store.setCholesterolUnit("mmol/L");
      expect(usePreferenceStore.getState().cholesterolUnit).toBe("mmol/L");

      // Reset
      store.setGlucoseUnit("mg/dL");
      store.setCholesterolUnit("mg/dL");
    });
  });

  describe("SettingsView UI Component", () => {
    it("renders appearance, uploaded reports, units, and calm footer", async () => {
      await addReport(createDummyReport("BloodTest_2024.pdf", "2024-04-15", 1), dummyResults(92));

      render(<SettingsView onDataChanged={() => {}} />);

      // Appearance
      expect(screen.getByText("Appearance")).toBeDefined();
      expect(screen.getByText("Light")).toBeDefined();
      expect(screen.getByText("Dark")).toBeDefined();
      expect(screen.getByText("System")).toBeDefined();

      // Uploaded reports & Undo button
      await waitFor(() => {
        expect(screen.getByText("BloodTest_2024.pdf")).toBeDefined();
      });
      expect(screen.getAllByText("Undo last upload").length).toBeGreaterThanOrEqual(1);

      // Units preference
      expect(screen.getByText("Units preference")).toBeDefined();
      expect(screen.getByText("Blood glucose")).toBeDefined();

      // Data section
      expect(screen.getByText("Data")).toBeDefined();
      expect(screen.getByRole("button", { name: /json/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /csv/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /delete all data/i })).toBeDefined();

      // Honest footer
      expect(
        screen.getByText(
          /Your data stays on this device/i
        )
      ).toBeDefined();
    });

    it("triggers undo confirmation sheet when 'Undo last upload' is clicked", async () => {
      await addReport(createDummyReport("Checkup_Jan2025.pdf", "2025-01-10", 1), dummyResults(90));

      render(<SettingsView onDataChanged={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText("Checkup_Jan2025.pdf")).toBeDefined();
      });

      const undoBtns = screen.getAllByRole("button", { name: /undo last upload/i });
      fireEvent.click(undoBtns[0]);

      // Confirmation sheet title and description appear
      expect(screen.getByText("Undo the last upload?")).toBeDefined();
      expect(
        screen.getByText("The app will go back to your previous report.")
      ).toBeDefined();
    });
  });
});
