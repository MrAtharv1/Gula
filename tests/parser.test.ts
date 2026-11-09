import { describe, it, expect } from "vitest";
import { parseReferenceRange } from "@/lib/parser/rangeParser";
import { extractReportDate } from "@/lib/parser/dateParser";
import { extractLabName, parseReportText } from "@/lib/parser/reportParser";

describe("Reference Range Parser", () => {
  it("parses two-number intervals correctly", () => {
    const r1 = parseReferenceRange("70 - 99");
    expect(r1.low).toBe(70);
    expect(r1.high).toBe(99);

    const r2 = parseReferenceRange("4.0 – 5.6");
    expect(r2.low).toBe(4.0);
    expect(r2.high).toBe(5.6);

    const r3 = parseReferenceRange("13.5 to 17.5");
    expect(r3.low).toBe(13.5);
    expect(r3.high).toBe(17.5);
  });

  it("parses upper bounds (< and <=)", () => {
    const r1 = parseReferenceRange("< 200");
    expect(r1.high).toBe(200);
    expect(r1.low).toBeUndefined();

    const r2 = parseReferenceRange("<= 150");
    expect(r2.high).toBe(150);
  });

  it("parses lower bounds (> and >=)", () => {
    const r1 = parseReferenceRange("> 40");
    expect(r1.low).toBe(40);
    expect(r1.high).toBeUndefined();

    const r2 = parseReferenceRange(">= 60");
    expect(r2.low).toBe(60);
  });
});

describe("Date Parser", () => {
  it("extracts labeled dates from report text", () => {
    expect(extractReportDate("Specimen Collection Date: 05/18/2024")).toBe("2024-05-18");
    expect(extractReportDate("Report Date: 2024-11-04")).toBe("2024-11-04");
    expect(extractReportDate("Date Collected: 15-Jan-2025")).toBe("2025-01-15");
  });

  it("extracts standalone dates when labels are absent", () => {
    expect(extractReportDate("Sample received on 2024-08-12 at 09:00")).toBe("2024-08-12");
  });
});

describe("Lab Name Extractor", () => {
  it("detects standard diagnostic laboratories", () => {
    expect(extractLabName("Quest Diagnostics - 123 Main St")).toBe("Quest Diagnostics");
    expect(extractLabName("Laboratory Corporation of America (Labcorp)")).toBe("Labcorp");
    expect(["Metropolis", "Metropolis Healthcare"]).toContain(extractLabName("Metropolis Healthcare Ltd."));
  });
});

describe("Rule-Based Report Parser Engine", () => {
  it("parses a realistic Quest Diagnostics Lipid & Metabolic panel", () => {
    const questSample = `
      Quest Diagnostics
      Patient: John Doe   DOB: 01/01/1980
      Collection Date: 04/15/2024   Report Date: 04/16/2024
      
      Test Name                 In Range   Out Of Range   Reference Range   Units
      GLUCOSE, FASTING          104 H                     70 - 99           mg/dL
      HEMOGLOBIN A1c            5.8 H                     < 5.7             %
      CHOLESTEROL, TOTAL                   225 H          125 - 199         mg/dL
      HDL CHOLESTEROL           42                        > 40              mg/dL
      LDL CHOLESTEROL                      148 H          < 100             mg/dL
      TRIGLYCERIDES                        175 H          < 150             mg/dL
      CREATININE                1.02                      0.70 - 1.30       mg/dL
      eGFR                      94                        > 60              mL/min/1.73m2
      TSH                       2.80                      0.40 - 4.50       uIU/mL
      VITAMIN D, 25-HYDROXY     24 L                      30 - 100          ng/mL
    `;

    const result = parseReportText(questSample);

    expect(result.labName).toBe("Quest Diagnostics");
    expect(result.date).toBe("2024-04-15");
    expect(result.biomarkers.length).toBeGreaterThanOrEqual(8);

    // Verify Glucose
    const glucose = result.biomarkers.find(
      (b) => b.canonicalKey === "glucose" || b.canonicalKey === "glucose_fasting"
    );
    expect(glucose).toBeDefined();
    expect(glucose?.value).toBe(104);
    expect(glucose?.unit).toBe("mg/dL");
    expect(glucose?.status).toBe("borderline"); // 104 is just above 99 within 5%

    // Verify Cholesterol
    const chol = result.biomarkers.find((b) => b.canonicalKey === "cholesterol_total");
    expect(chol).toBeDefined();
    expect(chol?.value).toBe(225);
    expect(chol?.status).toBe("abnormal");

    // Verify Vitamin D
    const vitD = result.biomarkers.find((b) => b.canonicalKey === "vitamin_d");
    expect(vitD).toBeDefined();
    expect(vitD?.value).toBe(24);
    expect(vitD?.status).toBe("borderline"); // 20-29 ng/mL is borderline insufficient

    // Verify Creatinine
    const creat = result.biomarkers.find((b) => b.canonicalKey === "creatinine");
    expect(creat).toBeDefined();
    expect(creat?.value).toBe(1.02);
    expect(creat?.status).toBe("normal");
  });

  it("parses a Labcorp Complete Blood Count report", () => {
    const labcorpSample = `
      Labcorp
      Specimen Date: 2025-01-10
      
      WBC                      6.5    4.5 - 11.0    K/uL
      Hemoglobin               14.2   13.5 - 17.5   g/dL
      Hematocrit               42.1   38.8 - 50.0   %
      Platelet Count           235    150 - 450     K/uL
      Alanine Aminotransferase 32     7 - 55        U/L
    `;

    const result = parseReportText(labcorpSample);
    expect(result.labName).toBe("Labcorp");
    expect(result.date).toBe("2025-01-10");

    const hb = result.biomarkers.find((b) => b.canonicalKey === "hemoglobin");
    expect(hb?.value).toBe(14.2);
    expect(hb?.status).toBe("normal");

    const wbc = result.biomarkers.find((b) => b.canonicalKey === "wbc");
    expect(wbc?.value).toBe(6.5);
    expect(wbc?.status).toBe("normal");

    const alt = result.biomarkers.find((b) => b.canonicalKey === "alt");
    expect(alt?.value).toBe(32);
    expect(alt?.status).toBe("normal");
  });
});
