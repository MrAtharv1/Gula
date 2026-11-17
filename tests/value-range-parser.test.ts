import { describe, it, expect } from "vitest";
import {
  parseValueCell,
  normalizeUnit,
  parseRangeCell,
  resolveFlag,
  parseRowFields,
} from "../lib/parser/valueRangeParser";

describe("Phase 4: Value, Range, and Flag Parsing Engine", () => {
  // ==========================================
  // Table-driven Test 1: Values & Glued Flags
  // ==========================================
  describe("Value cell parsing", () => {
    const valueTestCases = [
      {
        input: "8.9",
        expected: { value: 8.9, valueText: "8.9", isQualitative: false, flag: undefined },
      },
      {
        input: "0",
        expected: { value: 0, valueText: "0", isQualitative: false, flag: undefined },
      },
      {
        input: "1.20",
        expected: { value: 1.2, valueText: "1.20", isQualitative: false, flag: undefined },
      },
      {
        input: "8.9 L*",
        expected: { value: 8.9, valueText: "8.9", isQualitative: false, flag: "low", printed: "L*" },
      },
      {
        input: "16.3 H*",
        expected: { value: 16.3, valueText: "16.3", isQualitative: false, flag: "high", printed: "H*" },
      },
      {
        input: "2.4 CL*",
        expected: { value: 2.4, valueText: "2.4", isQualitative: false, flag: "critical_low", printed: "CL*" },
      },
      {
        input: "550 CH*",
        expected: { value: 550, valueText: "550", isQualitative: false, flag: "critical_high", printed: "CH*" },
      },
      {
        input: "120 H",
        expected: { value: 120, valueText: "120", isQualitative: false, flag: "high", printed: "H" },
      },
      {
        input: "45 L",
        expected: { value: 45, valueText: "45", isQualitative: false, flag: "low", printed: "L" },
      },
      {
        input: "Negative",
        expected: { value: null, valueText: "Negative", isQualitative: true, flag: undefined },
      },
      {
        input: "Positive(+++)",
        expected: { value: null, valueText: "Positive(+++)", isQualitative: true, flag: undefined },
      },
      {
        input: "Slightly Hazy",
        expected: { value: null, valueText: "Slightly Hazy", isQualitative: true, flag: undefined },
      },
      {
        input: "Present",
        expected: { value: null, valueText: "Present", isQualitative: true, flag: undefined },
      },
      {
        input: "Absent",
        expected: { value: null, valueText: "Absent", isQualitative: true, flag: undefined },
      },
      {
        input: "Normal",
        expected: { value: null, valueText: "Normal", isQualitative: true, flag: undefined },
      },
      {
        input: "Pale yellow",
        expected: { value: null, valueText: "Pale yellow", isQualitative: true, flag: undefined },
      },
      {
        input: "Trace",
        expected: { value: null, valueText: "Trace", isQualitative: true, flag: undefined },
      },
      {
        input: "4-6 H*",
        unitHint: "/hpf",
        expected: { value: null, valueText: "4-6", isQualitative: true, flag: "high", printed: "H*" },
      },
      {
        input: "4-6 /hpf",
        expected: { value: null, valueText: "4-6", isQualitative: true, flag: undefined },
      },
    ];

    valueTestCases.forEach(({ input, unitHint, expected }) => {
      it(`parses value cell: "${input}"`, () => {
        const res = parseValueCell(input, unitHint);
        expect(res.value).toBe(expected.value);
        expect(res.valueText).toBe(expected.valueText);
        expect(res.isQualitative).toBe(expected.isQualitative);
        if (expected.flag) {
          expect(res.flagFromValue).toBe(expected.flag);
        }
        if (expected.printed) {
          expect(res.printedFlag).toBe(expected.printed);
        }
      });
    });
  });

  // ==========================================
  // Table-driven Test 2: Unit Normalization
  // ==========================================
  describe("Unit normalization", () => {
    const unitTestCases = [
      { input: "µl", expected: "µL" },
      { input: "μl", expected: "µL" },
      { input: "uL", expected: "µL" },
      { input: "10^3/µl", expected: "10^3/µL" },
      { input: "10^3/μl", expected: "10^3/µL" },
      { input: "10^3/uL", expected: "10^3/µL" },
      { input: "10^9/L", expected: "10^9/L" },
      { input: "ml/min/1.73 sq m", expected: "mL/min/1.73m²" },
      { input: "mL/min/1.73m2", expected: "mL/min/1.73m²" },
      { input: "-", expected: null },
      { input: "nil", expected: null },
      { input: "", expected: null },
      { input: "mg/dL", expected: "mg/dL" },
      { input: "g/dL", expected: "g/dL" },
    ];

    unitTestCases.forEach(({ input, expected }) => {
      it(`normalizes unit "${input}" -> "${expected}"`, () => {
        expect(normalizeUnit(input)).toBe(expected);
      });
    });
  });

  // ==========================================
  // Table-driven Test 3: Range Formats
  // ==========================================
  describe("Range format parsing", () => {
    it("parses two-sided numeric ranges (standard, decimals, en dash)", () => {
      expect(parseRangeCell("13.0 - 17.0")).toMatchObject({ low: 13.0, high: 17.0, hasRange: true });
      expect(parseRangeCell("0.02-0.1")).toMatchObject({ low: 0.02, high: 0.1, hasRange: true });
      expect(parseRangeCell("50 – 116")).toMatchObject({ low: 50, high: 116, hasRange: true });
      expect(parseRangeCell("25.68- 42.8")).toMatchObject({ low: 25.68, high: 42.8, hasRange: true });
    });

    it("parses one-sided ranges without inventing lower bounds", () => {
      const r1 = parseRangeCell("< 45");
      expect(r1.high).toBe(45);
      expect(r1.low).toBeUndefined(); // Must NOT invent 0!
      expect(r1.modifier).toBe("<");

      const r2 = parseRangeCell("<1.00");
      expect(r2.high).toBe(1.0);
      expect(r2.low).toBeUndefined();

      const r3 = parseRangeCell("<= 5");
      expect(r3.high).toBe(5);
      expect(r3.low).toBeUndefined();
      expect(r3.modifier).toBe("<=");

      const r4 = parseRangeCell("> 40");
      expect(r4.low).toBe(40);
      expect(r4.high).toBeUndefined();
      expect(r4.modifier).toBe(">");

      const r5 = parseRangeCell(">= 90");
      expect(r5.low).toBe(90);
      expect(r5.high).toBeUndefined();
      expect(r5.modifier).toBe(">=");
    });

    it("parses multi-line tiers extracting desirable/normal tier", () => {
      const multi1 = parseRangeCell("Desirable : < 200 / Borderline high: 200 - 239 / High risk: > 240");
      expect(multi1.high).toBe(200);
      expect(multi1.modifier).toBe("<");
      expect(multi1.isMultiTier).toBe(true);

      const multi2 = parseRangeCell("Normal Or High: >= 90 / Mild Or Decrease: 60-89 / Moderate: 30-59");
      expect(multi2.low).toBe(90);
      expect(multi2.modifier).toBe(">=");
      expect(multi2.isMultiTier).toBe(true);

      const multi3 = parseRangeCell("Optimal: < 100\nNear optimal: 100 - 129\nBorderline high: 130 - 159");
      expect(multi3.high).toBe(100);
      expect(multi3.modifier).toBe("<");
    });

    it("parses expected-value qualitative ranges", () => {
      expect(parseRangeCell("Negative").expectedText).toBe("Negative");
      expect(parseRangeCell("Absent").expectedText).toBe("Absent");
      expect(parseRangeCell("Clear").expectedText).toBe("Clear");
      expect(parseRangeCell("Pale yellow").expectedText).toBe("Pale yellow");
      expect(parseRangeCell("Normal").expectedText).toBe("Normal");
    });

    it("identifies complex or missing ranges", () => {
      expect(parseRangeCell("Refer Table Below").hasRange).toBe(false);
      expect(parseRangeCell("-").hasRange).toBe(false);
      expect(parseRangeCell("").hasRange).toBe(false);
    });
  });

  // ==========================================
  // Table-driven Test 4: Flag Decisions
  // ==========================================
  describe("Flag decisions and lab trust", () => {
    it("TRUSTS printed lab flags (L, H, CL, CH)", () => {
      const rowL = parseRowFields("8.9 L*", "g/dL", "13.0 - 17.0", "Hemoglobin");
      expect(rowL.flag).toBe("low");
      expect(rowL.printedFlag).toBe("L*");

      const rowH = parseRowFields("16.3 H*", "%", "11.6 - 14.0", "RDW-CV");
      expect(rowH.flag).toBe("high");
      expect(rowH.printedFlag).toBe("H*");

      const rowCL = parseRowFields("2.0 CL*", "mg/dL", "8.5 - 10.5", "Calcium");
      expect(rowCL.flag).toBe("critical_low");

      const rowCH = parseRowFields("600 CH*", "mg/dL", "70 - 100", "Glucose");
      expect(rowCH.flag).toBe("critical_high");
    });

    it("computes numeric flags when no lab flag is printed", () => {
      const normal = parseRowFields("14.5", "g/dL", "13.0 - 17.0", "Hemoglobin");
      expect(normal.flag).toBe("normal");

      const low = parseRowFields("11.5", "g/dL", "13.0 - 17.0", "Hemoglobin");
      expect(low.flag).toBe("low");

      const high = parseRowFields("18.5", "g/dL", "13.0 - 17.0", "Hemoglobin");
      expect(high.flag).toBe("high");

      const oneSidedHigh = parseRowFields("220", "mg/dL", "< 200", "Cholesterol");
      expect(oneSidedHigh.flag).toBe("high");

      const oneSidedNormal = parseRowFields("180", "mg/dL", "< 200", "Cholesterol");
      expect(oneSidedNormal.flag).toBe("normal");
    });

    it("assigns neutral 'no_range' when range is missing or complex and no lab flag exists (never Normal)", () => {
      const unassigned = parseRowFields("25.0", "U/L", "Refer Table Below", "Special Enzyme");
      expect(unassigned.flag).toBe("no_range");

      const dashRange = parseRowFields("10", "mL", "-", "Volume");
      expect(dashRange.flag).toBe("no_range");
    });

    it("retains lab flag and adds a warning when lab flag and computed flag disagree", () => {
      // Lab printed H* on value 90, while range is 70 - 100 (which normally is within bounds)
      const conflict = parseRowFields("90 H*", "mg/dL", "70 - 100", "Glucose");
      expect(conflict.flag).toBe("high"); // Kept lab flag!
      expect(conflict.warning).toBeDefined();
      expect(conflict.warning).toContain("conflicts with computed range");
    });
  });
});
