import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { parsePdfText } from "../lib/parser/pdfParser";
import { ExtractedPage, PositionedToken } from "../lib/parser/textExtractor";
import { classifyDocumentPages } from "../lib/parser/pageClassifier";
import { parseRowFields } from "../lib/parser/valueRangeParser";

/**
 * Helper to construct synthetic tokens from aligned lines
 */
function createSyntheticPage(pageNumber: number, lines: string[]): ExtractedPage {
  const tokens: PositionedToken[] = [];
  let currentY = 800;

  for (const line of lines) {
    // Check if line represents columns separated by 2+ spaces or tabs
    const parts = line.split(/\s{2,}|\t/).filter(Boolean);
    let currentX = 30;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      // Assign realistic X coordinates based on column slot
      let x = currentX;
      if (parts.length >= 3) {
        if (i === 0) x = 30;
        else if (i === 1) x = 240;
        else if (i === 2) x = 330;
        else if (i === 3) x = 420;
      }

      tokens.push({
        str: part,
        x,
        y: currentY,
        width: part.length * 6,
        height: 10,
      });

      currentX = x + part.length * 6 + 15;
    }

    currentY -= 15;
  }

  return {
    pageNumber,
    lines,
    fullText: lines.join("\n"),
    tokens,
  };
}

describe("Phase 7: Synthetic Fixtures & End-to-End QA", () => {
  // =========================================================================
  // 1. Multi-page report with repeated header on every page
  // =========================================================================
  it("Fixture 1: Multi-page report with repeated header on every page", () => {
    const pageHeader = [
      "Patient Name: John Doe    Age/Gender: 40 Y/M    Sample Collected: 2026-09-01 08:30 AM",
      "Patient ID / UHID: 998877    Barcode: 11223344    Referred By: Self",
      "Test Description    Value(s)    Unit(s)    Reference Range",
    ];

    const p1 = createSyntheticPage(1, [
      ...pageHeader,
      "RBC Parameters",
      "Hemoglobin    14.0    g/dL    13.0 - 17.0",
      "RBC Count    4.8    10^6/µl    4.5 - 5.5",
    ]);

    const p2 = createSyntheticPage(2, [
      ...pageHeader,
      "Platelet Parameters",
      "Platelet Count    250    10^3/µl    150 - 450",
      "MCV    88    fl    83 - 101",
    ]);

    const p3 = createSyntheticPage(3, [
      ...pageHeader,
      "Lipid Profile",
      "Total Cholesterol    180    mg/dL    < 200",
    ]);

    const output = parsePdfText({ pages: [p1, p2, p3] }, 3);

    expect(output.reportDate).toBe("2026-09-01");
    expect(output.patientName).toBeUndefined();
    expect(JSON.stringify(output)).not.toContain("John Doe");

    // All 5 tests extracted across 3 pages
    expect(output.results).toHaveLength(5);
    const keys = output.results.map((r) => r.metricKey);
    expect(keys).toContain("hemoglobin");
    expect(keys).toContain("rbc");
    expect(keys).toContain("platelets");
    expect(keys).toContain("mcv");
    expect(keys).toContain("cholesterol_total");

    // Repeated headers on pages 2 and 3 did not inject false metrics
    expect(keys).not.toContain("patient_name");
    expect(keys).not.toContain("barcode");
  });

  // =========================================================================
  // 2. Marketing/wellness on pages 1-3, results on 4-6, interpretation on 7
  // =========================================================================
  it("Fixture 2: Marketing/wellness on pages 1-3, results on 4-6, interpretation on 7", () => {
    const p1 = createSyntheticPage(1, [
      "SMART HEALTH OVERVIEW",
      "Health Score: 92/100    Roadmap to Vitality",
      "Download the App from App Store or Google Play",
      "Terms and Conditions apply.",
    ]);

    const p2 = createSyntheticPage(2, [
      "WELLNESS ROADMAP & LIFESTYLE RECOMMENDATIONS",
      "Doctor Consultation included. Book your slot now.",
      "Track your metrics effortlessly.",
    ]);

    const p3 = createSyntheticPage(3, [
      "ABOUT OUR ACCREDITED NETWORK",
      "CAP and NABL Accredited State-of-the-Art Laboratory.",
      "Customer Care: 1800-123-4567",
    ]);

    const p4 = createSyntheticPage(4, [
      "Patient Details: Anonymous    Sample Collected: 2026-09-02",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Glucose Fasting    105 H*    mg/dL    70 - 100",
    ]);

    const p5 = createSyntheticPage(5, [
      "Patient Details: Anonymous    Sample Collected: 2026-09-02",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Bilirubin Total    0.8    mg/dL    0.2 - 1.2",
    ]);

    const p6 = createSyntheticPage(6, [
      "Patient Details: Anonymous    Sample Collected: 2026-09-02",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Thyroid Stimulating Hormone (Ultrasensitive)    2.5    µIU/mL    0.35 - 4.94",
    ]);

    const p7 = createSyntheticPage(7, [
      "Patient Details: Anonymous",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Interpretation:",
      "Risk Stratification Guidelines for Fasting Plasma Glucose:",
      "< 100 Optimal",
      "100 - 125 Impaired Fasting Glucose",
      ">= 126 Provisional Diabetes",
      "*** End of Report ***",
    ]);

    const classification = classifyDocumentPages([p1, p2, p3, p4, p5, p6, p7]);
    expect(classification.pages_used).toEqual([4, 5, 6]);
    expect(classification.pages_skipped.map((s) => s.pageNumber)).toEqual([1, 2, 3, 7]);

    const output = parsePdfText({ pages: [p1, p2, p3, p4, p5, p6, p7] }, 7);
    expect(output.results).toHaveLength(3);
    const keys = output.results.map((r) => r.metricKey);
    expect(keys).toEqual(["glucose_fasting", "bilirubin_total", "tsh"]);

    // Ensure interpretation table numbers ("< 100 Optimal", "100 - 125") are ignored
    expect(keys).not.toContain("optimal");
    expect(keys).not.toContain("impaired_fasting_glucose");
  });

  // =========================================================================
  // 3. 3-column summary table followed by 4-column detail tables (parse detail only)
  // =========================================================================
  it("Fixture 3: 3-column summary table followed by 4-column detail tables", () => {
    const summaryPage = createSyntheticPage(1, [
      "LAB TEST SUMMARY",
      "Test Name    Result    Range",
      "Hemoglobin    14.0 g/dL    13.0 - 17.0",
      "Glucose Fasting    95 mg/dL    70 - 100",
    ]);

    const detailPage1 = createSyntheticPage(2, [
      "Patient Header Block    Sample Collected: 2026-09-03",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Hemoglobin    14.0    g/dL    13.0 - 17.0",
      "Cyanide free spectrophotometry",
      "Glucose Fasting    95    mg/dL    70 - 100",
      "Hexokinase",
    ]);

    const detailPage2 = createSyntheticPage(3, [
      "Patient Header Block    Sample Collected: 2026-09-03",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Creatinine    1.0    mg/dL    0.6 - 1.3",
      "Kinetic alkaline picrate",
    ]);

    const classification = classifyDocumentPages([summaryPage, detailPage1, detailPage2]);
    expect(classification.isFallbackSummary).toBe(false);
    expect(classification.pages_used).toEqual([2, 3]);
    expect(classification.pages_skipped.some((s) => s.pageNumber === 1)).toBe(true);

    const output = parsePdfText({ pages: [summaryPage, detailPage1, detailPage2] }, 3);
    expect(output.results).toHaveLength(3);
    expect(output.results.every((r) => r.source === "detail")).toBe(true);
    expect(output.warnings).not.toContain("Ranges may be simplified.");
  });

  // =========================================================================
  // 4. Report with NO detail tables, only 3-column summary (fallback with warning)
  // =========================================================================
  it("Fixture 4: Report with NO detail tables, only 3-column summary table", () => {
    const summaryOnlyPage = createSyntheticPage(1, [
      "EXECUTIVE SUMMARY TABLE",
      "Test Name    Result    Range",
      "Total Cholesterol    195    < 200",
      "Triglycerides    120    < 150",
    ]);

    const classification = classifyDocumentPages([summaryOnlyPage]);
    expect(classification.isFallbackSummary).toBe(true);
    expect(classification.pages_used).toEqual([1]);

    const output = parsePdfText({ pages: [summaryOnlyPage] }, 1);
    expect(output.results).toHaveLength(2);
    expect(output.results.every((r) => r.source === "summary")).toBe(true);
    expect(output.warnings).toContain("Ranges may be simplified.");
  });

  // =========================================================================
  // 5. Scanned report with zero text
  // =========================================================================
  it("Fixture 5: Scanned report with zero text returns graceful error", () => {
    const emptyPage1: ExtractedPage = { pageNumber: 1, lines: [], fullText: "", tokens: [] };
    const emptyPage2: ExtractedPage = { pageNumber: 2, lines: [], fullText: "", tokens: [] };

    const output = parsePdfText({ pages: [emptyPage1, emptyPage2] }, 2);
    expect(output.confidence).toBe(0);
    expect(output.results).toHaveLength(0);
    expect(output.errors).toContain(
      "This looks like a scanned copy. We can't read it yet. Try the original PDF from the lab."
    );
  });

  // =========================================================================
  // 6. Scanned report with < 20 characters of garbage OCR
  // =========================================================================
  it("Fixture 6: Scanned report with < 20 chars of garbage OCR returns graceful error", () => {
    const garbagePage: ExtractedPage = {
      pageNumber: 1,
      lines: ["xyz 123 !?"],
      fullText: "xyz 123 !?",
      tokens: [
        { str: "xyz", x: 10, y: 100, width: 20, height: 10 },
        { str: "123", x: 40, y: 100, width: 20, height: 10 },
      ],
    };

    const output = parsePdfText({ pages: [garbagePage] }, 1);
    expect(output.confidence).toBe(0);
    expect(output.results).toHaveLength(0);
    expect(output.errors).toContain(
      "This looks like a scanned copy. We can't read it yet. Try the original PDF from the lab."
    );
  });

  // =========================================================================
  // 7. Single 1-sided range, 2-sided range, and unflagged complex range
  // =========================================================================
  it("Fixture 7: Handles 1-sided, 2-sided, and complex unflagged ranges without inventing bounds", () => {
    // 1-sided range
    const f1 = parseRowFields("180", "mg/dL", "< 150", "Triglycerides");
    expect(f1.refLow).toBeUndefined();
    expect(f1.refHigh).toBe(150);
    expect(f1.flag).toBe("high");

    // 2-sided range
    const f2 = parseRowFields("14.5", "g/dL", "13.0 - 17.0", "Hemoglobin");
    expect(f2.refLow).toBe(13.0);
    expect(f2.refHigh).toBe(17.0);
    expect(f2.flag).toBe("normal");

    // Complex unflagged range -> neutral no_range, never normal!
    const f3 = parseRowFields(
      "75",
      "mL/min/1.73m²",
      "Refer table below for CKD staging recommendations",
      "eGFR"
    );
    expect(f3.refLow).toBeUndefined();
    expect(f3.refHigh).toBeUndefined();
    expect(f3.flag).toBe("no_range");
    expect(f3.flag).not.toBe("normal");
  });

  // =========================================================================
  // 8. Both differential (%) and absolute leukocyte counts exist with distinct keys
  // =========================================================================
  it("Fixture 8: Differential (%) and absolute leukocyte counts map to distinct keys without collision", () => {
    const page = createSyntheticPage(1, [
      "Patient Header    Sample Collected: 2026-09-04",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Differential Leucocyte Count",
      "Neutrophils    60    %    40 - 75",
      "Lymphocytes    30    %    20 - 45",
      "Absolute Leukocyte Counts",
      "Neutrophils.    3.5    10^3/µl    2.0 - 7.0",
      "Lymphocytes.    1.8    10^3/µl    1.0 - 3.0",
    ]);

    const output = parsePdfText({ pages: [page] }, 1);
    expect(output.results).toHaveLength(4);

    const diffNeutro = output.results.find((r) => r.metricKey === "neutrophils_pct");
    const absNeutro = output.results.find((r) => r.metricKey === "neutrophils_abs");
    const diffLympho = output.results.find((r) => r.metricKey === "lymphocytes_pct");
    const absLympho = output.results.find((r) => r.metricKey === "lymphocytes_abs");

    expect(diffNeutro).toBeDefined();
    expect(absNeutro).toBeDefined();
    expect(diffLympho).toBeDefined();
    expect(absLympho).toBeDefined();

    expect(diffNeutro?.value).toBe(60);
    expect(diffNeutro?.unit).toBe("%");
    expect(absNeutro?.value).toBe(3.5);
    expect(absNeutro?.unit).toBe("10^3/µL");

    expect(diffNeutro?.metricKey).not.toBe(absNeutro?.metricKey);
    expect(diffLympho?.metricKey).not.toBe(absLympho?.metricKey);
  });

  // =========================================================================
  // 9. Urine routine table (urine protein != blood protein, urine rbc != blood rbc)
  // =========================================================================
  it("Fixture 9: Urine routine table tests cleanly separate from systemic blood tests", () => {
    const page = createSyntheticPage(1, [
      "Patient Header    Sample Collected: 2026-09-05",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Liver Function Test",
      "Total Protein    6.8    g/dL    6.0 - 8.3",
      "RBC Parameters",
      "RBC Count    4.9    10^6/µl    4.5 - 5.5",
      "Urine Routine and Microscopic Examination",
      "Physical Examination",
      "Volume    15    mL    -",
      "Chemical Examination",
      "Reaction (pH)    6.5    -    4.5 - 8.0",
      "Specific Gravity    1.015    -    1.010 - 1.030",
      "Urine Protein (Albumin)    Negative    -    Negative",
      "Microscopic Examination",
      "Red blood Cells    1-2    /hpf    0 - 2",
    ]);

    const output = parsePdfText({ pages: [page] }, 1);

    const bloodProtein = output.results.find((r) => r.metricKey === "protein_total");
    const urineProtein = output.results.find((r) => r.metricKey === "urine_protein");
    expect(bloodProtein).toBeDefined();
    expect(urineProtein).toBeDefined();
    expect(bloodProtein?.metricKey).not.toBe(urineProtein?.metricKey);
    expect(bloodProtein?.category).toBe("Liver");
    expect(urineProtein?.category).toBe("Other");

    const bloodRbc = output.results.find((r) => r.metricKey === "rbc");
    const urineRbc = output.results.find((r) => r.metricKey === "urine_rbc");
    expect(bloodRbc).toBeDefined();
    expect(urineRbc).toBeDefined();
    expect(bloodRbc?.metricKey).not.toBe(urineRbc?.metricKey);
    expect(bloodRbc?.category).toBe("Blood");
    expect(urineRbc?.category).toBe("Other");
  });

  // =========================================================================
  // 10. The 30-page failing example (integration test, < 3s, skips in CI)
  // =========================================================================
  it("Fixture 10: 30-page real lab PDF parses in under 3 seconds with accurate counts and grouping", async () => {
    const samplePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
    if (!fs.existsSync(samplePath)) {
      console.log("Sample PDF not found locally, skipping integration test gracefully in CI.");
      return;
    }

    const startTime = performance.now();
    const buffer = fs.readFileSync(samplePath);
    const data = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;

    const extractedPages: ExtractedPage[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items: PositionedToken[] = (content.items as any[])
        .filter((it: any) => it.str && typeof it.str === "string" && it.str.trim().length > 0)
        .map((it: any) => ({
          str: it.str.trim(),
          x: it.transform[4],
          y: it.transform[5],
          width: it.width || 0,
          height: it.height || 0,
        }));

      items.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff <= 4) return a.x - b.x;
        return b.y - a.y;
      });

      const lineBuckets: PositionedToken[][] = [];
      let currentBucket: PositionedToken[] = [];
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

      const lines = lineBuckets.map((b) => b.map((x) => x.str).join("    "));
      extractedPages.push({
        pageNumber: i,
        lines,
        fullText: lines.join("\n"),
        tokens: items,
      });
    }

    const output = parsePdfText({ pages: extractedPages }, doc.numPages);
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    console.log(`Praveen_Chauhan-1.pdf full extraction duration: ${durationMs.toFixed(1)} ms`);

    // Speed verification: under 3 seconds!
    expect(durationMs).toBeLessThan(3000);

    // Extraction verifications
    expect(output.totalPages).toBe(30);
    expect(output.pages_used).toHaveLength(12);
    expect(output.results.length).toBeGreaterThanOrEqual(87);

    // Date & PII
    expect(output.reportDate).toBe("2026-09-05");
    expect(output.patientName).toBeUndefined();
    expect(JSON.stringify(output)).not.toContain("Praveen Chauhan");

    // Zero duplicate keys
    const metricKeys = output.results.map((r) => r.metricKey);
    const uniqueKeys = new Set(metricKeys);
    expect(uniqueKeys.size).toBe(metricKeys.length);
  });
});
