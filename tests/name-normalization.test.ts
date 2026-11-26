import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { normalizeMetric, slugify, cleanPunctuation } from "../lib/parser/nameNormalizer";
import { detectReportDateWithWarning, parseDateString } from "../lib/parser/dateDetector";
import { parsePdfText } from "../lib/parser/pdfParser";
import { ExtractedPage, PositionedToken } from "../lib/parser/textExtractor";

describe("Phase 5: Name Normalization and Metadata Extraction", () => {
  describe("Match order & Alias Resolution", () => {
    it("exact alias match works cleanly", () => {
      const res = normalizeMetric("Hemoglobin", "g/dL", "RBC Parameters");
      expect(res.canonicalKey).toBe("hemoglobin");
      expect(res.category).toBe("Blood");
      expect(res.isKnown).toBe(true);
    });

    it("cleaned punctuation match handles symbols and parentheses", () => {
      const res = normalizeMetric("SGOT/AST", "U/L", "Liver Function Test");
      expect(res.canonicalKey).toBe("ast");
      expect(res.displayName).toBe("SGOT / AST");
      expect(res.category).toBe("Liver");
    });

    it("token-based match prioritizes longest alias first (Hemoglobin does NOT match Glycosylated Hemoglobin)", () => {
      const hba1cRes = normalizeMetric("Glycosylated Hemoglobin (HbA1c)", "%", "HbA1C");
      expect(hba1cRes.canonicalKey).toBe("hba1c");
      expect(hba1cRes.canonicalKey).not.toBe("hemoglobin");
      expect(hba1cRes.category).toBe("Sugar");

      const hbRes = normalizeMetric("Total Hemoglobin", "g/dL", "Blood");
      expect(hbRes.canonicalKey).toBe("hemoglobin");
      expect(hbRes.category).toBe("Blood");
    });
  });

  describe("Disambiguation (Unit and Section)", () => {
    it("separates differential percentage counts from absolute leukocyte counts", () => {
      // Differential percentage counts
      const diffNeutro = normalizeMetric("Neutrophils", "%", "Differential Leucocyte Count");
      expect(diffNeutro.canonicalKey).toBe("neutrophils_pct");
      expect(diffNeutro.category).toBe("Blood");

      const diffLympho = normalizeMetric("Lymphocytes", "%", "Differential Leucocyte Count");
      expect(diffLympho.canonicalKey).toBe("lymphocytes_pct");

      const diffMono = normalizeMetric("Monocytes", "%", "Differential Leucocyte Count");
      expect(diffMono.canonicalKey).toBe("monocytes_pct");

      const diffEos = normalizeMetric("Eosinophils", "%", "Differential Leucocyte Count");
      expect(diffEos.canonicalKey).toBe("eosinophils_pct");

      const diffBaso = normalizeMetric("Basophils", "%", "Differential Leucocyte Count");
      expect(diffBaso.canonicalKey).toBe("basophils_pct");

      // Absolute leukocyte counts
      const absNeutro = normalizeMetric("Neutrophils.", "10^3/µl", "Absolute Leukocyte Counts");
      expect(absNeutro.canonicalKey).toBe("neutrophils_abs");
      expect(absNeutro.displayName).toBe("Absolute Neutrophils (ANC)");

      const absLympho = normalizeMetric("Lymphocytes.", "10^3/µl", "Absolute Leukocyte Counts");
      expect(absLympho.canonicalKey).toBe("lymphocytes_abs");

      const absMono = normalizeMetric("Monocytes.", "10^3/µl", "Absolute Leukocyte Counts");
      expect(absMono.canonicalKey).toBe("monocytes_abs");

      const absEos = normalizeMetric("Eosinophils.", "10^3/µl", "Absolute Leukocyte Counts");
      expect(absEos.canonicalKey).toBe("eosinophils_abs");

      const absBaso = normalizeMetric("Basophils.", "10^3/µl", "Absolute Leukocyte Counts");
      expect(absBaso.canonicalKey).toBe("basophils_abs");

      // Verify absolute and percentage keys are distinct
      expect(diffNeutro.canonicalKey).not.toBe(absNeutro.canonicalKey);
      expect(diffLympho.canonicalKey).not.toBe(absLympho.canonicalKey);
      expect(diffMono.canonicalKey).not.toBe(absMono.canonicalKey);
      expect(diffEos.canonicalKey).not.toBe(absEos.canonicalKey);
      expect(diffBaso.canonicalKey).not.toBe(absBaso.canonicalKey);
    });

    it("separates urine section tests from systemic blood tests", () => {
      // Protein
      const bloodProtein = normalizeMetric("Total Protein", "g/dL", "Liver Function Test");
      const urineProtein = normalizeMetric("Urine Protein (Albumin)", "-", "Chemical Examination");
      expect(bloodProtein.canonicalKey).toBe("protein_total");
      expect(urineProtein.canonicalKey).toBe("urine_protein");
      expect(bloodProtein.canonicalKey).not.toBe(urineProtein.canonicalKey);

      // Glucose
      const bloodGlucose = normalizeMetric("Glucose Fasting", "mg/dL", "Blood Sugar Fasting");
      const urineGlucose = normalizeMetric("Urine Glucose", "-", "Chemical Examination");
      expect(bloodGlucose.canonicalKey).toBe("glucose_fasting");
      expect(urineGlucose.canonicalKey).toBe("urine_glucose");
      expect(bloodGlucose.canonicalKey).not.toBe(urineGlucose.canonicalKey);

      // RBC
      const bloodRbc = normalizeMetric("RBC Count", "10^6/µl", "RBC Parameters");
      const urineRbc = normalizeMetric("Red blood Cells", "/hpf", "Microscopic Examination");
      expect(bloodRbc.canonicalKey).toBe("rbc");
      expect(urineRbc.canonicalKey).toBe("urine_rbc");
      expect(bloodRbc.canonicalKey).not.toBe(urineRbc.canonicalKey);

      // Bilirubin
      const bloodBili = normalizeMetric("Bilirubin Total", "mg/dL", "Liver Function Test");
      const urineBili = normalizeMetric("Bilirubin Urine", "-", "Peroxidase Hemoglobin");
      expect(bloodBili.canonicalKey).toBe("bilirubin_total");
      expect(urineBili.canonicalKey).toBe("urine_bilirubin");
      expect(bloodBili.canonicalKey).not.toBe(urineBili.canonicalKey);

      // Urinalysis specific tests
      expect(normalizeMetric("Leucocyte esterase", "-", "Peroxidase Hemoglobin").canonicalKey).toBe("urine_leukocyte_esterase");
      expect(normalizeMetric("Nitrite", "-", "Peroxidase Hemoglobin").canonicalKey).toBe("urine_nitrite");
      expect(normalizeMetric("Urobilinogen", "-", "Peroxidase Hemoglobin").canonicalKey).toBe("urine_urobilinogen");
      expect(normalizeMetric("Specific Gravity", "-", "Chemical Examination").canonicalKey).toBe("urine_specific_gravity");
      expect(normalizeMetric("Reaction (pH)", "-", "Chemical Examination").canonicalKey).toBe("urine_ph");
    });

    it("assigns distinct canonical keys to all clinical ratios", () => {
      const bunCreat = normalizeMetric("Bun/Creatinine Ratio", "Ratio", "Kidney Function Test");
      const ureaCreat = normalizeMetric("Urea / Creatinine Ratio", "Ratio", "Kidney Function Test");
      const agRatio = normalizeMetric("A/G Ratio", "Ratio", "Liver Function Test");
      const sgotSgpt = normalizeMetric("SGOT / SGPT Ratio", "Ratio", "Liver Function Test");
      const cholHdl = normalizeMetric("Chol/HDL Ratio", "Ratio", "Lipid Profile");
      const hdlLdl = normalizeMetric("HDL/ LDL Ratio", "Ratio", "Lipid Profile");
      const ldlHdl = normalizeMetric("LDL/HDL Ratio", "Ratio", "Lipid Profile");
      const mentzer = normalizeMetric("Mentzer Index", "", "Platelet Parameters");

      expect(bunCreat.canonicalKey).toBe("bun_creat_ratio");
      expect(ureaCreat.canonicalKey).toBe("urea_creatinine_ratio");
      expect(agRatio.canonicalKey).toBe("ag_ratio");
      expect(sgotSgpt.canonicalKey).toBe("sgot_sgpt_ratio");
      expect(cholHdl.canonicalKey).toBe("chol_hdl_ratio");
      expect(hdlLdl.canonicalKey).toBe("hdl_ldl_ratio");
      expect(ldlHdl.canonicalKey).toBe("ldl_hdl_ratio");
      expect(mentzer.canonicalKey).toBe("mentzer_index");

      const ratioKeys = new Set([
        bunCreat.canonicalKey,
        ureaCreat.canonicalKey,
        agRatio.canonicalKey,
        sgotSgpt.canonicalKey,
        cholHdl.canonicalKey,
        hdlLdl.canonicalKey,
        ldlHdl.canonicalKey,
        mentzer.canonicalKey,
      ]);
      expect(ratioKeys.size).toBe(8);
    });
  });

  describe("Required Aliases from Example Report", () => {
    it("correctly identifies all 28 required specific aliases", () => {
      expect(normalizeMetric("Glucose Fasting").canonicalKey).toBe("glucose_fasting");
      expect(normalizeMetric("Glucose Post Prandial").canonicalKey).toBe("glucose_pp");
      expect(normalizeMetric("Glycosylated Hemoglobin (HbA1c)").canonicalKey).toBe("hba1c");
      expect(normalizeMetric("Estimated Average Glucose").canonicalKey).toBe("estimated_average_glucose");
      expect(normalizeMetric("TLC").canonicalKey).toBe("wbc");
      expect(normalizeMetric("PCV").canonicalKey).toBe("hematocrit");
      expect(normalizeMetric("SGOT/AST").canonicalKey).toBe("ast");
      expect(normalizeMetric("SGPT/ALT").canonicalKey).toBe("alt");
      expect(normalizeMetric("Gamma Glutamyl Transferase (GGT)").canonicalKey).toBe("ggt");
      expect(normalizeMetric("Alkaline Phosphatase").canonicalKey).toBe("alp");
      expect(normalizeMetric("Blood Urea").canonicalKey).toBe("blood_urea");
      expect(normalizeMetric("BUN").canonicalKey).toBe("bun");
      expect(normalizeMetric("eGFR (CKD-EPI)").canonicalKey).toBe("egfr");
      expect(normalizeMetric("Total Thyroxine (T4)").canonicalKey).toBe("t4_total");
      expect(normalizeMetric("Triiodothyronine (T3)").canonicalKey).toBe("t3_total");
      expect(normalizeMetric("Thyroid Stimulating Hormone (Ultrasensitive)").canonicalKey).toBe("tsh");
      expect(normalizeMetric("V.L.D.L Cholesterol").canonicalKey).toBe("vldl");
      expect(normalizeMetric("Non HDL Cholesterol").canonicalKey).toBe("non_hdl");
      expect(normalizeMetric("ESR - Erythrocyte Sedimentation Rate").canonicalKey).toBe("esr");
      expect(normalizeMetric("PDW").canonicalKey).toBe("pdw");
      expect(normalizeMetric("MPV").canonicalKey).toBe("mpv");
      expect(normalizeMetric("P-LCR").canonicalKey).toBe("p_lcr");
      expect(normalizeMetric("P-LCC").canonicalKey).toBe("p_lcc");
      expect(normalizeMetric("PCT", "%", "Platelet Parameters").canonicalKey).toBe("pct_platelet");
      expect(normalizeMetric("RDW-CV").canonicalKey).toBe("rdw_cv");
      expect(normalizeMetric("RDW-SD").canonicalKey).toBe("rdw_sd");
      expect(normalizeMetric("Phosphorus").canonicalKey).toBe("phosphorus");
      expect(normalizeMetric("Uric Acid").canonicalKey).toBe("uric_acid");
      expect(normalizeMetric("Calcium Serum").canonicalKey).toBe("calcium");
      expect(normalizeMetric("Iron").canonicalKey).toBe("iron_serum");
    });

    it("unknown tests are NOT dropped: saved under Other with slugified key and printed name", () => {
      const customTest = normalizeMetric("Advanced Cardiac Troponin I", "ng/mL", "Cardiac Markers");
      expect(customTest.isKnown).toBe(false);
      expect(customTest.category).toBe("Other");
      expect(customTest.displayName).toBe("Advanced Cardiac Troponin I");
      expect(customTest.canonicalKey).toBe("advanced_cardiac_troponin_i");
    });
  });

  describe("Metadata & Date Extraction", () => {
    it("prefers Sample Collected date, discards time, and ignores print date and instrument run date", () => {
      const reportText = `
        Dr. Lal PathLabs
        Patient NAME : Mr John Doe
        Patient ID / UHID : 12345/ABC
        Barcode NO : 99887766
        Sample Collected : Sep 05, 2026, 08:23 AM
        Report Date : Sep 05, 2026, 01:42 PM
        Printed Date : Sep 06, 2026, 10:00 AM
        Instrument Run Date : Sep 05, 2026, 09:15 AM
      `;

      const result = detectReportDateWithWarning(reportText);
      expect(result.reportDate).toBe("2026-09-05");
      expect(result.warning).toBeUndefined();
    });

    it("supports Indian/UK date format (DD/MM/YYYY), ISO, and Month strings", () => {
      expect(parseDateString("05/09/2026")).toBe("2026-09-05");
      expect(parseDateString("05-09-2026")).toBe("2026-09-05");
      expect(parseDateString("Sep 05, 2026")).toBe("2026-09-05");
      expect(parseDateString("05 Sep 2026")).toBe("2026-09-05");
      expect(parseDateString("2026-09-05")).toBe("2026-09-05");
    });

    it("resolves conflicting collection dates to the earliest valid date with a warning", () => {
      const conflictingText = `
        Sample Collected : 07/09/2026 09:00 AM
        Sample Collected : 05/09/2026 11:30 AM
        Report Date : 08/09/2026 05:00 PM
      `;

      const result = detectReportDateWithWarning(conflictingText);
      expect(result.reportDate).toBe("2026-09-05");
      expect(result.warning).toContain("Multiple collection dates detected");
      expect(result.warning).toContain("2026-09-05");
    });
  });

  describe("End-to-End Extraction on Example PDF (Praveen_Chauhan-1.pdf)", () => {
    it("extracts all metrics with zero duplicate keys, separated urine tests, and correct metadata without patient info", async () => {
      const samplePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
      if (!fs.existsSync(samplePath)) {
        console.log("Sample PDF not found, skipping integration test.");
        return;
      }

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

      // Verify report date is accurately extracted
      expect(output.reportDate).toBe("2026-09-05");
      expect(output.date).toBe("2026-09-05");

      // Verify patient privacy: NO patient name, patient ID, or barcode stored
      expect(output.patientName).toBeUndefined();
      expect(JSON.stringify(output)).not.toContain("Praveen Chauhan");
      expect(JSON.stringify(output)).not.toContain("18676804");
      expect(JSON.stringify(output)).not.toContain("35585722");

      // Verify metrics extracted
      expect(output.results.length).toBeGreaterThanOrEqual(70);

      // Verify ZERO duplicate keys
      const metricKeys = output.results.map((r) => r.metricKey);
      const uniqueKeys = new Set(metricKeys);
      expect(uniqueKeys.size).toBe(metricKeys.length);

      // Verify separation of percentage vs absolute leukocyte counts
      const diffNeutro = output.results.find((r) => r.metricKey === "neutrophils_pct");
      const absNeutro = output.results.find((r) => r.metricKey === "neutrophils_abs");
      expect(diffNeutro).toBeDefined();
      expect(absNeutro).toBeDefined();
      expect(diffNeutro?.value).toBe(58.5);
      expect(diffNeutro?.unit).toBe("%");
      expect(absNeutro?.value).toBe(1.23);
      expect(absNeutro?.unit).toBe("10^3/µL");

      // Verify separation of blood tests and urine tests
      const bloodProtein = output.results.find((r) => r.metricKey === "protein_total");
      const urineProtein = output.results.find((r) => r.metricKey === "urine_protein");
      expect(bloodProtein).toBeDefined();
      expect(urineProtein).toBeDefined();

      const bloodRbc = output.results.find((r) => r.metricKey === "rbc");
      const urineRbc = output.results.find((r) => r.metricKey === "urine_rbc");
      expect(bloodRbc).toBeDefined();
      expect(urineRbc).toBeDefined();

      // Verify methods were separated and not merged into test names
      const hb = output.results.find((r) => r.metricKey === "hemoglobin");
      expect(hb).toBeDefined();
      expect(hb?.displayName).toBe("Hemoglobin");
      expect(hb?.method).toBe("Cyanide free spectrophotometry");
      expect(hb?.name).not.toContain("Cyanide");

      // Verify RDW-CV vs RDW-SD separation
      const rdwCv = output.results.find((r) => r.metricKey === "rdw_cv");
      const rdwSd = output.results.find((r) => r.metricKey === "rdw_sd");
      expect(rdwCv).toBeDefined();
      expect(rdwSd).toBeDefined();
      expect(rdwCv?.value).toBe(16.3);
      expect(rdwSd?.value).toBe(45.1);

      // Verify ratios are present
      expect(output.results.some((r) => r.metricKey === "sgot_sgpt_ratio")).toBe(true);
      expect(output.results.some((r) => r.metricKey === "bun_creat_ratio")).toBe(true);
      expect(output.results.some((r) => r.metricKey === "urea_creatinine_ratio")).toBe(true);
      expect(output.results.some((r) => r.metricKey === "ag_ratio")).toBe(true);
      expect(output.results.some((r) => r.metricKey === "chol_hdl_ratio")).toBe(true);
      expect(output.results.some((r) => r.metricKey === "mentzer_index")).toBe(true);

      // Verify qualitative urine results preserve valueText instead of losing it to numeric 0
      expect(urineProtein?.valueText).toBeTruthy();
    });

    it("aligns METRIC_DICTIONARY keys (CRP, Folate, ApoB, Hormones) in parser and aliases rdw_cv/blood_urea/protein_total", async () => {
      const { METRIC_KEY_ALIASES, getMetricDefinition } = await import(
        "@/lib/db/metricDictionary"
      );
      expect(METRIC_KEY_ALIASES.rdw_cv).toBe("rdw");
      expect(METRIC_KEY_ALIASES.blood_urea).toBe("urea");
      expect(METRIC_KEY_ALIASES.protein_total).toBe("total_protein");
      expect(getMetricDefinition("rdw_cv")?.canonicalKey).toBe("rdw");

      expect(normalizeMetric("hs-CRP").canonicalKey).toBe("crp");
      expect(normalizeMetric("Folic Acid").canonicalKey).toBe("folate");
      expect(normalizeMetric("Apolipoprotein B").canonicalKey).toBe("apob");
      expect(normalizeMetric("Total Testosterone").canonicalKey).toBe("testosterone_total");
    });
  });
});
