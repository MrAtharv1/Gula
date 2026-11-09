import { describe, it, expect } from "vitest";
import { parsePdfText } from "@/lib/parser/pdfParser";
import { detectReportDate } from "@/lib/parser/dateDetector";
import { detectLabName } from "@/lib/parser/labDetector";
import { extractReferenceRange } from "@/lib/parser/rangeExtractor";

describe("Phase 3: Range Extractor", () => {
  it("extracts two-number ranges", () => {
    expect(extractReferenceRange("13.0 - 17.0")).toEqual({
      low: 13.0,
      high: 17.0,
      raw: "13.0 - 17.0",
    });
    expect(extractReferenceRange("13.0-17.0")).toEqual({
      low: 13.0,
      high: 17.0,
      raw: "13.0-17.0",
    });
  });

  it("extracts single-bound ranges (<, >, Up to)", () => {
    expect(extractReferenceRange("< 200").high).toBe(200);
    expect(extractReferenceRange("> 40").low).toBe(40);
    expect(extractReferenceRange("Up to 5.7").high).toBe(5.7);
  });

  it("extracts main normal bounds from multi-tier range strings", () => {
    const multi1 = extractReferenceRange(
      "Desirable: <200 / Borderline: 200-239 / High: >=240"
    );
    expect(multi1.high).toBe(200);

    const multi2 = extractReferenceRange(
      "Normal: 70-100 / High: > 100"
    );
    expect(multi2.low).toBe(70);
    expect(multi2.high).toBe(100);
  });
});

describe("Phase 3: Date & Lab Detection", () => {
  it("defaults to Indian Day-First format (DD/MM/YYYY)", () => {
    // 05/11/2024 must be Nov 5, 2024, NOT May 11
    expect(detectReportDate("Date of Collection: 05/11/2024")).toBe("2024-11-05");
    expect(detectReportDate("Collected: 15-04-2024")).toBe("2024-04-15");
    expect(detectReportDate("Report Date: 12 Jan 2025")).toBe("2025-01-12");
  });

  it("returns null if no date is found", () => {
    expect(detectReportDate("No dates mentioned in this text.")).toBeNull();
  });

  it("detects Indian and global diagnostic lab headers", () => {
    expect(detectLabName("Welcome to Dr Lal PathLabs, Delhi Branch")).toBe("Dr Lal PathLabs");
    expect(detectLabName("THYROCARE TECHNOLOGIES LTD, Navi Mumbai")).toBe("Thyrocare");
    expect(detectLabName("Metropolis Healthcare Pathology")).toBe("Metropolis");
    expect(detectLabName("Apollo Diagnostics Report")).toBe("Apollo Diagnostics");
    expect(detectLabName("Tata 1mg Diagnostic Services")).toBe("Tata 1mg");
    expect(detectLabName("SRL Diagnostics Pvt Ltd")).toBe("SRL Diagnostics");
    expect(detectLabName("Random Hospital")).toBe("Unknown lab");
  });
});

describe("Phase 3: Synthetic Lab Fixtures & Never-Throw Guarantee", () => {
  it("Fixture 1: parses Dr Lal PathLabs multi-column table layout", () => {
    const lalFixture = `
      Dr Lal PathLabs
      Patient Name: Ramesh Sharma    Age: 45 / Male    UHID: 1092831
      Collected: 15/04/2024 08:30    Reported: 16/04/2024 14:00
      Referred By: Dr. A. Gupta, MD
      
      Investigation                      Result    Units    Reference Value
      FASTING BLOOD GLUCOSE              104 H     mg/dL    70 - 100
      TOTAL CHOLESTEROL                  225 H     mg/dL    < 200
      SERUM CREATININE                   1.05      mg/dL    0.7 - 1.3
      TSH                                3.20      uIU/mL   0.40 - 4.50
      HEMOGLOBIN                         14.2      g/dL     13.0 - 17.0
      PLATELET COUNT                     240       K/uL     150 - 450
      
      Interpretation:
      Glucose is mildly elevated above 100.
      Kindly consult your physician.
      This report is not valid for medico-legal purpose.
      End of Report.
    `;

    const parsed = parsePdfText(lalFixture);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.labName).toBe("Dr Lal PathLabs");
    expect(parsed.reportDate).toBe("2024-04-15");
    expect(parsed.confidence).toBeGreaterThan(0.7);
    expect(parsed.results.length).toBe(6);

    const glucose = parsed.results.find((r) => r.metricKey === "glucose_fasting");
    expect(glucose).toBeDefined();
    expect(glucose?.value).toBe(104);
    expect(glucose?.flag).toBe("borderline"); // 104 with 70-100 is borderline

    const chol = parsed.results.find((r) => r.metricKey === "cholesterol_total");
    expect(chol).toBeDefined();
    expect(chol?.value).toBe(225);
    expect(chol?.flag).toBe("high");
  });

  it("Fixture 2: parses Thyrocare layout with multi-tier ranges and modifiers", () => {
    const thyrocareFixture = `
      THYROCARE
      Sample Date: 12-05-2024
      Patient: Priya Patel   Barcode: THY1239
      
      TEST NAME                 TECHNOLOGY   VALUE    UNITS   REFERENCE INTERVAL
      TOTAL CHOLESTEROL         PHOTOMETRY   185      mg/dL   Desirable: <200 / Borderline: 200-239 / High: >=240
      HDL CHOLESTEROL           PHOTOMETRY   48       mg/dL   > 40
      LDL CHOLESTEROL           CALCULATED   112      mg/dL   Optimal: < 100
      TRIGLYCERIDES             PHOTOMETRY   142      mg/dL   Normal: 70-150
      HS-CRP                    ECLIA        <0.5     mg/L    Up to 3.0
      VITAMIN B-12              C.L.I.A      540      pg/mL   211 - 911
      
      Methodology: Quantitative Spectrophotometry
      Please correlate clinically with patient signs.
    `;

    const parsed = parsePdfText(thyrocareFixture);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.labName).toBe("Thyrocare");
    expect(parsed.reportDate).toBe("2024-05-12");
    expect(parsed.results.length).toBe(6);

    // Verify <0.5 modifier
    const crp = parsed.results.find((r) => r.metricKey === "crp");
    expect(crp).toBeDefined();
    expect(crp?.value).toBe(0.5);
    expect(crp?.modifier).toBe("<");
    expect(crp?.flag).toBe("normal");

    // Verify multi-tier range extraction for cholesterol
    const chol = parsed.results.find((r) => r.metricKey === "cholesterol_total");
    expect(chol?.refHigh).toBe(200);
    expect(chol?.flag).toBe("normal");
  });

  it("Fixture 3: parses single-column list layout with printed flags", () => {
    const singleColFixture = `
      Apollo Diagnostics
      Date: 2025-01-18
      
      Fasting Glucose: 92 mg/dL (70 - 99)
      HbA1c: 5.4 % (4.0 - 5.6)
      SGPT (ALT): 28 U/L (7 - 55)
      SGOT (AST): 24 U/L (8 - 48)
      Uric Acid: 5.2 mg/dL (3.5 - 7.2)
      Platelet Count: 250 K/uL (150 - 450)
      Special Cardiac Protein: 12.5 ng/mL (5.0 - 25.0)
    `;

    const parsed = parsePdfText(singleColFixture);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.labName).toBe("Apollo Diagnostics");
    expect(parsed.reportDate).toBe("2025-01-18");
    expect(parsed.results.length).toBe(7);

    // Verify unknown test saved under category "Other"
    const unknown = parsed.results.find((r) => r.displayName.includes("Special Cardiac Protein"));
    expect(unknown).toBeDefined();
    expect(unknown?.category).toBe("Other");
    expect(unknown?.value).toBe(12.5);
  });

  it("Edge Case 1: handles empty text gracefully without throwing", () => {
    const parsed = parsePdfText("");
    expect(parsed.results.length).toBe(0);
    expect(parsed.confidence).toBe(0);
    expect(parsed.errors).toContain("Empty document text. No characters could be extracted.");
    expect(parsed.labName).toBe("Unknown lab");
  });

  it("Edge Case 2: handles scanned/minimal text gracefully without throwing", () => {
    const parsed = parsePdfText("SCAN 102");
    expect(parsed.results.length).toBe(0);
    expect(parsed.confidence).toBe(0);
    expect(parsed.errors[0]).toContain("This looks like a scanned copy");
  });

  it("Edge Case 3: handles non-lab garbage text gracefully without throwing", () => {
    const garbage = `
      INVOICE #49821
      Due Date: 30 days
      Total Amount: $450.00
      Terms and Conditions apply.
    `;
    const parsed = parsePdfText(garbage);
    expect(parsed.results.length).toBe(0);
    expect(parsed.errors).toContain("We couldn't find any test results in this file.");
  });
});
