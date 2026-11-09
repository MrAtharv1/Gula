import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  db,
  addReport,
  getActiveReports,
  getLatestResults,
  getHistory,
  undoLastUpload,
  restoreUndone,
  deleteAllData,
  loadDemoData,
} from "@/lib/db";
import {
  METRIC_DICTIONARY,
  matchMetric,
  evaluateResultFlag,
} from "@/lib/db/metricDictionary";
import {
  convertGlucose,
  convertCholesterol,
  convertTriglycerides,
  convertMetricUnit,
} from "@/lib/db/unitConversion";

describe("Phase 1: Metric Dictionary & Alias Matching", () => {
  it("contains at least 60 common clinical tests", () => {
    const keys = Object.keys(METRIC_DICTIONARY);
    expect(keys.length).toBeGreaterThanOrEqual(60);
  });

  it("maps required blood aliases to hemoglobin", () => {
    expect(matchMetric("Hb")?.canonicalKey).toBe("hemoglobin");
    expect(matchMetric("HGB")?.canonicalKey).toBe("hemoglobin");
    expect(matchMetric("Haemoglobin")?.canonicalKey).toBe("hemoglobin");
    expect(matchMetric("Hemoglobin")?.canonicalKey).toBe("hemoglobin");
  });

  it("maps lipid panel aliases correctly", () => {
    expect(matchMetric("LDL")?.canonicalKey).toBe("ldl");
    expect(matchMetric("LDL Cholesterol")?.canonicalKey).toBe("ldl");
    expect(matchMetric("LDL-C")?.canonicalKey).toBe("ldl");
    expect(matchMetric("Low Density Lipoprotein")?.canonicalKey).toBe("ldl");

    expect(matchMetric("HDL")?.canonicalKey).toBe("hdl");
    expect(matchMetric("Total Cholesterol")?.canonicalKey).toBe("cholesterol_total");
    expect(matchMetric("Triglycerides")?.canonicalKey).toBe("triglycerides");
    expect(matchMetric("VLDL")?.canonicalKey).toBe("vldl");
  });

  it("maps sugar and diabetes aliases correctly", () => {
    expect(matchMetric("HbA1c")?.canonicalKey).toBe("hba1c");
    expect(matchMetric("Glycosylated Hemoglobin")?.canonicalKey).toBe("hba1c");
    expect(matchMetric("A1C")?.canonicalKey).toBe("hba1c");

    expect(matchMetric("Fasting Glucose")?.canonicalKey).toBe("glucose_fasting");
    expect(matchMetric("FBS")?.canonicalKey).toBe("glucose_fasting");
    expect(matchMetric("PP Glucose")?.canonicalKey).toBe("glucose_pp");
  });

  it("maps thyroid, liver, kidney, and vitamin aliases correctly", () => {
    expect(matchMetric("TSH")?.canonicalKey).toBe("tsh");
    expect(matchMetric("Thyroid Stimulating Hormone")?.canonicalKey).toBe("tsh");
    expect(matchMetric("T3")?.canonicalKey).toBe("t3_total");
    expect(matchMetric("T4")?.canonicalKey).toBe("t4_total");

    expect(matchMetric("SGPT")?.canonicalKey).toBe("alt");
    expect(matchMetric("ALT")?.canonicalKey).toBe("alt");
    expect(matchMetric("SGOT")?.canonicalKey).toBe("ast");
    expect(matchMetric("AST")?.canonicalKey).toBe("ast");

    expect(matchMetric("Creatinine")?.canonicalKey).toBe("creatinine");
    expect(matchMetric("Urea")?.canonicalKey).toBe("urea");
    expect(matchMetric("Uric Acid")?.canonicalKey).toBe("uric_acid");

    expect(matchMetric("Vitamin D")?.canonicalKey).toBe("vitamin_d");
    expect(matchMetric("25-OH Vitamin D")?.canonicalKey).toBe("vitamin_d");
    expect(matchMetric("25(OH)D")?.canonicalKey).toBe("vitamin_d");

    expect(matchMetric("Vitamin B12")?.canonicalKey).toBe("vitamin_b12");
    expect(matchMetric("Cobalamin")?.canonicalKey).toBe("vitamin_b12");
    expect(matchMetric("Ferritin")?.canonicalKey).toBe("ferritin");
  });

  it("maps hematology and electrolyte aliases", () => {
    expect(matchMetric("Platelet Count")?.canonicalKey).toBe("platelets");
    expect(matchMetric("WBC")?.canonicalKey).toBe("wbc");
    expect(matchMetric("RBC")?.canonicalKey).toBe("rbc");
    expect(matchMetric("Hematocrit")?.canonicalKey).toBe("hematocrit");
    expect(matchMetric("PCV")?.canonicalKey).toBe("hematocrit");
    expect(matchMetric("MCV")?.canonicalKey).toBe("mcv");
    expect(matchMetric("MCH")?.canonicalKey).toBe("mch");
    expect(matchMetric("MCHC")?.canonicalKey).toBe("mchc");

    expect(matchMetric("Calcium")?.canonicalKey).toBe("calcium");
    expect(matchMetric("Sodium")?.canonicalKey).toBe("sodium");
    expect(matchMetric("Potassium")?.canonicalKey).toBe("potassium");
  });
});

describe("Phase 1: Unit Conversion Helpers", () => {
  it("converts glucose between mg/dL and mmol/L", () => {
    // 90 mg/dL / 18.0182 = 4.99 mmol/L
    expect(convertGlucose(90, "mg/dL", "mmol/L")).toBe(4.99);
    // 5.0 mmol/L * 18.0182 = 90.1 mg/dL
    expect(convertGlucose(5.0, "mmol/L", "mg/dL")).toBe(90.1);
  });

  it("converts cholesterol between mg/dL and mmol/L", () => {
    // 193.35 mg/dL / 38.67 = 5.0 mmol/L
    expect(convertCholesterol(193.35, "mg/dL", "mmol/L")).toBe(5.0);
    // 5.0 mmol/L * 38.67 = 193.4 mg/dL
    expect(convertCholesterol(5.0, "mmol/L", "mg/dL")).toBe(193.4);
  });

  it("converts triglycerides between mg/dL and mmol/L", () => {
    // 150 mg/dL / 88.57 = 1.69 mmol/L
    expect(convertTriglycerides(150, "mg/dL", "mmol/L")).toBe(1.69);
  });

  it("converts via universal convertMetricUnit helper", () => {
    const res = convertMetricUnit("glucose_fasting", 90, "mg/dL", "mmol/L");
    expect(res.value).toBe(4.99);
    expect(res.unit).toBe("mmol/L");
  });
});

describe("Phase 1: IndexedDB Repository & Undo/Restore Operations", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("adds a report and results with fileBlob and retrieves active reports", async () => {
    const mockBlob = new Blob(["PDF dummy content"], { type: "application/pdf" });
    const reportId = await addReport(
      {
        fileName: "test_report.pdf",
        labName: "Quest Diagnostics",
        reportDate: "2024-05-10",
        uploadedAt: 1000,
        status: "active",
        fileBlob: mockBlob,
        parseWarnings: [],
      },
      [
        {
          metricKey: "glucose_fasting",
          displayName: "Glucose",
          value: 92,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "normal",
          category: "Sugar",
        },
      ]
    );

    expect(reportId).toBeGreaterThan(0);

    const active = await getActiveReports();
    expect(active.length).toBe(1);
    expect(active[0].fileName).toBe("test_report.pdf");
    expect(active[0].fileBlob).toBeDefined();

    const history = await getHistory("glucose_fasting");
    expect(history.length).toBe(1);
    expect(history[0].value).toBe(92);
  });

  it("calculates latest results and deltas across multiple active reports", async () => {
    // Report 1
    await addReport(
      {
        fileName: "rep1.pdf",
        reportDate: "2024-01-15",
        uploadedAt: 1000,
        status: "active",
        parseWarnings: [],
      },
      [
        {
          metricKey: "cholesterol_total",
          displayName: "Total Cholesterol",
          value: 220,
          unit: "mg/dL",
          refLow: 125,
          refHigh: 199,
          flag: "high",
          category: "Lipids",
        },
      ]
    );

    // Report 2
    await addReport(
      {
        fileName: "rep2.pdf",
        reportDate: "2024-06-15",
        uploadedAt: 2000,
        status: "active",
        parseWarnings: [],
      },
      [
        {
          metricKey: "cholesterol_total",
          displayName: "Total Cholesterol",
          value: 195,
          unit: "mg/dL",
          refLow: 125,
          refHigh: 199,
          flag: "normal",
          category: "Lipids",
        },
      ]
    );

    const latest = await getLatestResults();
    expect(latest.length).toBe(1);
    expect(latest[0].latestResult.value).toBe(195);
    expect(latest[0].previousResult?.value).toBe(220);
    expect(latest[0].changeValue).toBe(-25);
    expect(latest[0].historyCount).toBe(2);
  });

  it("supports undoLastUpload and restoreUndone workflow", async () => {
    // Upload report 1
    await addReport(
      {
        fileName: "first.pdf",
        reportDate: "2024-01-01",
        uploadedAt: 1000,
        status: "active",
        parseWarnings: [],
      },
      [
        {
          metricKey: "hemoglobin",
          displayName: "Hemoglobin",
          value: 14.0,
          unit: "g/dL",
          flag: "normal",
          category: "Blood",
        },
      ]
    );

    // Upload report 2
    await addReport(
      {
        fileName: "second_mistake.pdf",
        reportDate: "2024-06-01",
        uploadedAt: 2000,
        status: "active",
        parseWarnings: [],
      },
      [
        {
          metricKey: "hemoglobin",
          displayName: "Hemoglobin",
          value: 15.5,
          unit: "g/dL",
          flag: "normal",
          category: "Blood",
        },
      ]
    );

    let activeReports = await getActiveReports();
    expect(activeReports.length).toBe(2);

    // Undo the last upload
    const undone = await undoLastUpload();
    expect(undone?.fileName).toBe("second_mistake.pdf");
    expect(undone?.status).toBe("undone");

    activeReports = await getActiveReports();
    expect(activeReports.length).toBe(1);
    expect(activeReports[0].fileName).toBe("first.pdf");

    // Check latest results only reflects the active report
    let latest = await getLatestResults();
    expect(latest[0].latestResult.value).toBe(14.0);

    // Restore the undone report
    const restored = await restoreUndone();
    expect(restored?.fileName).toBe("second_mistake.pdf");
    expect(restored?.status).toBe("active");

    activeReports = await getActiveReports();
    expect(activeReports.length).toBe(2);

    latest = await getLatestResults();
    expect(latest[0].latestResult.value).toBe(15.5);
  });

  it("seeds demo data properly and provides multiple reports", async () => {
    await loadDemoData();
    const reports = await getActiveReports();
    expect(reports.length).toBe(3);

    const summaries = await getLatestResults();
    expect(summaries.length).toBeGreaterThanOrEqual(10);

    const glucoseHistory = await getHistory("glucose_fasting");
    expect(glucoseHistory.length).toBe(3);
    // Verify sorted ascending by date
    expect(new Date(glucoseHistory[0].reportDate).getTime()).toBeLessThan(
      new Date(glucoseHistory[1].reportDate).getTime()
    );
  });
});
