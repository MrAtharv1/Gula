import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { classifyDocumentPages } from "@/lib/parser/pageClassifier";
import { extractAdaptiveTableRows } from "@/lib/parser/layoutAdaptiveExtractor";
import { parseRowFields } from "@/lib/parser/valueRangeParser";
import { normalizeMetric } from "@/lib/parser/nameNormalizer";
import { detectReportDate } from "@/lib/parser/dateDetector";
import { parsePdfText } from "@/lib/parser/pdfParser";

describe("Real 27-Page Lab PDF Heuristic Verification", () => {
  it("processes C:\\Users\\intel\\Downloads\\Praveen_Chauhan.pdf through general-purpose heuristics", async () => {
    const pdfPath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan.pdf";
    if (!fs.existsSync(pdfPath)) {
      console.log("PDF not found, skipping.");
      return;
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const buf = fs.readFileSync(pdfPath);
    const startTime = performance.now();

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      disableFontFace: true,
    }).promise;

    expect(doc.numPages).toBe(27);

    const extractedPages: any[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items as any[])
        .filter((it: any) => it.str && typeof it.str === "string" && it.str.trim().length > 0)
        .map((it: any) => ({
          str: it.str.trim(),
          x: it.transform[4],
          y: it.transform[5],
          width: it.width || 0,
          height: it.height || 0,
        }));

      items.sort((a: any, b: any) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.x - b.x;
      });

      const lineBuckets: any[][] = [];
      let currentBucket: any[] = [];
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

      const lines = lineBuckets.map((bucket) =>
        bucket.map((b) => b.str.trim()).join("  ")
      );
      const pageFullText = lines.join("\n");

      extractedPages.push({
        pageNumber: i,
        lines,
        fullText: pageFullText,
        tokens: items,
      });
    }

    // 1. Page Classification
    const classification = classifyDocumentPages(extractedPages);
    console.log("\n=== 1. PAGE CLASSIFICATION RESULTS ===");
    console.log("Pages used for extraction:", classification.pages_used);
    console.log("Pages skipped count:", classification.pages_skipped.length);
    for (const p of classification.pages) {
      console.log(
        `Page ${String(p.pageNumber).padStart(2)}: ${p.classification.padEnd(19)} - ${p.reason}`
      );
    }

    // Verify correct page classification according to general-purpose heuristic rules:
    // Pages 1-3: Marketing, cover, overview -> SKIP
    expect(classification.pages[0].classification).toBe("SKIP");
    expect(classification.pages[1].classification).toBe("SKIP");
    expect(classification.pages[2].classification).toBe("SKIP");

    // Pages 4-11: Comparative Summary tables (no separate unit column in header) -> RESULT_SUMMARY
    for (let p = 3; p <= 10; p++) {
      expect(["RESULT_SUMMARY", "SKIP"]).toContain(classification.pages[p].classification);
    }

    // Pages 12-13: Advertisements and health roadmaps -> SKIP
    expect(classification.pages[11].classification).toBe("SKIP");
    expect(classification.pages[12].classification).toBe("SKIP");

    // Pages 14-21, 23, 24: Authentic laboratory report pages -> RESULT_DETAIL
    expect(classification.pages[13].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[14].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[15].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[16].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[17].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[18].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[19].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[20].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[22].classification).toBe("RESULT_DETAIL");
    expect(classification.pages[23].classification).toBe("RESULT_DETAIL");

    // Page 22: ASCVD Risk stratification (no value rows) -> INTERPRETATION_ONLY
    expect(classification.pages[21].classification).toBe("INTERPRETATION_ONLY");

    // Page 25: Bio-Rad D-100 instrument printout chromatogram -> SKIP
    expect(classification.pages[24].classification).toBe("SKIP");

    // Page 26: Terms & conditions -> SKIP
    expect(classification.pages[25].classification).toBe("SKIP");

    // Page 27: App download & promo -> SKIP
    expect(classification.pages[26].classification).toBe("SKIP");

    // 2. Date Detection
    const detectedDate = detectReportDate(extractedPages);
    console.log("\n=== 2. METADATA ===");
    console.log("Detected report date:", detectedDate);
    expect(detectedDate).toBe("2026-11-19");

    // 3. Layout-Adaptive Extraction
    const rawRows = extractAdaptiveTableRows(classification.pagesToParse);
    console.log("\n=== 3. RAW RESULT ROWS SEGMENTED ===");
    console.log("Total segmented rows:", rawRows.length);

    // 4. Value, range parsing and name normalization
    const results: any[] = [];
    const keyCounts: Record<string, number> = {};

    for (const row of rawRows) {
      const fields = parseRowFields(row.valueCell, row.unitCell, row.rangeCell, row.name);
      const norm = normalizeMetric(row.name, row.unitCell, row.section, fields.unit || undefined);

      keyCounts[norm.canonicalKey] = (keyCounts[norm.canonicalKey] || 0) + 1;

      results.push({
        page: row.pageNumber,
        section: row.section || "(none)",
        rawName: row.name,
        method: row.method || null,
        metricKey: norm.canonicalKey,
        displayName: norm.displayName,
        category: norm.category,
        value: fields.value,
        valueText: fields.valueText,
        labFlag: fields.printedFlag,
        finalFlag: fields.flag,
        unit: fields.unit || row.unitCell,
        range: fields.rawRange,
        low: fields.refLow,
        high: fields.refHigh,
      });
    }

    const duration = performance.now() - startTime;
    console.log(`\n=== 4. EXTRACTION SUMMARY ===`);
    console.log(`Total tests extracted: ${results.length} in ${duration.toFixed(1)} ms`);

    // Verify duplicate keys
    const duplicateKeys = Object.entries(keyCounts).filter(([_, count]) => count > 1);
    console.log("Duplicate metric keys:", duplicateKeys.length === 0 ? "NONE (0 duplicate keys)" : duplicateKeys);
    expect(duplicateKeys.length).toBe(0);

    // Print all extracted results
    console.log("\n=== 5. COMPLETE EXTRACTED RESULTS TABLE ===");
    results.forEach((r, idx) => {
      console.log(
        `${String(idx + 1).padStart(2)}. [P.${String(r.page).padStart(2)}] [${r.section.padEnd(28)}] ${r.rawName.padEnd(38)} -> key: ${r.metricKey.padEnd(20)} | val: ${String(r.value ?? r.valueText).padEnd(8)} ${r.labFlag ? `(${r.labFlag})` : "   "} | unit: ${(r.unit || "-").padEnd(14)} | range: ${r.range || "-"}`
      );
    });

    // Check key critical clinical metrics from the pages to verify precision:
    // Page 14: HbA1c = 7.5 H*, < 5.7 %
    const hba1c = results.find((r) => r.metricKey === "hba1c");
    expect(hba1c).toBeDefined();
    expect(hba1c?.value).toBe(7.5);
    expect(hba1c?.finalFlag).toBe("high");
    expect(hba1c?.labFlag).toBe("H*");
    expect(hba1c?.unit).toBe("%");
    expect(hba1c?.high).toBe(5.7);

    // Page 15: Hemoglobin = 9.6 L*, 13.0 - 17.0 g/dL
    const hb = results.find((r) => r.metricKey === "hemoglobin");
    expect(hb).toBeDefined();
    expect(hb?.value).toBe(9.6);
    expect(hb?.finalFlag).toBe("low");
    expect(hb?.labFlag).toBe("L*");
    expect(hb?.unit).toBe("g/dL");
    expect(hb?.low).toBe(13.0);
    expect(hb?.high).toBe(17.0);

    // Page 15: Differential Neutrophils vs Absolute Neutrophils (must have distinct keys!)
    const neutPct = results.find((r) => r.metricKey === "neutrophils_pct");
    expect(neutPct).toBeDefined();
    expect(neutPct?.value).toBe(65.5);

    const neutAbs = results.find((r) => r.metricKey === "neutrophils_abs");
    expect(neutAbs).toBeDefined();
    expect(neutAbs?.value).toBe(1.9);

    // Page 18: Glucose Fasting = 215.9 H*, 70 - 100 mg/dL
    const fbg = results.find((r) => r.metricKey === "glucose_fasting");
    expect(fbg).toBeDefined();
    expect(fbg?.value).toBe(215.9);
    expect(fbg?.finalFlag).toBe("high");
    expect(fbg?.labFlag).toBe("H*");

    // Page 19: SGOT/AST = 43.45 H*, SGPT/ALT = 25.01
    const ast = results.find((r) => r.metricKey === "ast");
    expect(ast).toBeDefined();
    expect(ast?.value).toBe(43.45);
    expect(ast?.finalFlag).toBe("high");
    expect(ast?.labFlag).toBe("H*");

    const alt = results.find((r) => r.metricKey === "alt");
    expect(alt).toBeDefined();
    expect(alt?.value).toBe(25.01);

    // Page 19: SGOT/SGPT Ratio = 1.74 H*
    const astAltRatio = results.find((r) => r.metricKey === "sgot_sgpt_ratio");
    expect(astAltRatio).toBeDefined();
    expect(astAltRatio?.value).toBe(1.74);
    expect(astAltRatio?.finalFlag).toBe("high");
    expect(astAltRatio?.labFlag).toBe("H*");

    // Page 20: Creatinine = 1.36 H*, eGFR = 59.93 L*
    const creat = results.find((r) => r.metricKey === "creatinine");
    expect(creat).toBeDefined();
    expect(creat?.value).toBe(1.36);
    expect(creat?.finalFlag).toBe("high");
    expect(creat?.labFlag).toBe("H*");

    const egfr = results.find((r) => r.metricKey === "egfr");
    expect(egfr).toBeDefined();
    expect(egfr?.value).toBe(59.93);
    expect(egfr?.finalFlag).toBe("low");
    expect(egfr?.labFlag).toBe("L*");

    // Page 21: Lipid profile
    const chol = results.find((r) => r.metricKey === "cholesterol_total");
    expect(chol).toBeDefined();
    expect(chol?.value).toBe(180.54);

    const tg = results.find((r) => r.metricKey === "triglycerides");
    expect(tg).toBeDefined();
    expect(tg?.value).toBe(123.64);

    const ldl = results.find((r) => r.metricKey === "ldl");
    expect(ldl).toBeDefined();
    expect(ldl?.value).toBe(114.2);
    expect(ldl?.finalFlag).toBe("high");
    expect(ldl?.labFlag).toBe("H*");

    // Page 23: Thyroid profile
    const tsh = results.find((r) => r.metricKey === "tsh");
    expect(tsh).toBeDefined();
    expect(tsh?.value).toBe(1.9303);

    const t3 = results.find((r) => r.metricKey === "t3_total");
    expect(t3).toBeDefined();
    expect(t3?.value).toBe(61.63);

    const t4 = results.find((r) => r.metricKey === "t4_total");
    expect(t4).toBeDefined();
    expect(t4?.value).toBe(5.83);

    // Page 24: FIB-4 Score
    const fib4 = results.find((r) => r.metricKey === "fib_4_score");
    expect(fib4).toBeDefined();
    expect(fib4?.value).toBe(5.4);

    // 5. Full End-to-End parsePdfText Verification
    const fullResult = parsePdfText({ pages: extractedPages }, doc.numPages);
    console.log("\n=== 6. END-TO-END parsePdfText RESULT ===");
    console.log("Lab Name:", fullResult.labName);
    console.log("Report Date:", fullResult.reportDate);
    console.log("Biomarkers parsed:", fullResult.biomarkers.length);
    console.log("Pages used:", fullResult.pages_used);
    console.log("Errors / Warnings:", fullResult.errors);

    expect(fullResult.reportDate).toBe("2026-11-19");
    expect(fullResult.biomarkers.length).toBeGreaterThanOrEqual(60);
    expect(fullResult.pages_used).toEqual([14, 15, 16, 17, 18, 19, 20, 21, 23, 24]);
  });
});
