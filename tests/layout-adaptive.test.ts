import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  extractAdaptiveTableRows,
  extractPageRows,
  deriveColumnBoundaries,
  tokensFromLines,
  PositionedToken,
} from "../lib/parser/layoutAdaptiveExtractor";
import { classifyDocumentPages } from "../lib/parser/pageClassifier";
import { ExtractedPage } from "../lib/parser/textExtractor";

describe("Phase 3: Layout-Adaptive Extraction", () => {
  it("derives dynamic column x-boundaries from header tokens", () => {
    const headerTokens: PositionedToken[] = [
      { str: "Test Description", x: 30, y: 700, width: 80, height: 10 },
      { str: "Value(s)", x: 230, y: 700, width: 40, height: 10 },
      { str: "Unit(s)", x: 320, y: 700, width: 35, height: 10 },
      { str: "Reference Range", x: 410, y: 700, width: 90, height: 10 },
    ];

    const bounds = deriveColumnBoundaries(headerTokens, 600);
    expect(bounds.nameXEnd).toBeLessThan(230);
    expect(bounds.nameXEnd).toBeGreaterThan(100);
    expect(bounds.valueXEnd).toBeLessThan(320);
    expect(bounds.valueXEnd).toBeGreaterThan(230);
    expect(bounds.unitXEnd).toBeLessThan(410);
    expect(bounds.unitXEnd).toBeGreaterThan(320);
  });

  it("restricts extraction strictly to the results region (below header, above interpretation)", () => {
    const lines = [
      "Patient NAME : John Doe    DOB : 1980-01-01",
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Hemoglobin    14.2    g/dL    13.0 - 17.0",
      "Platelet Count    240    10^3/µl    150 - 450",
      "Interpretation:",
      "< 100 Optimal",
      "100 - 129 Above Optimal",
      "130 - 159 Borderline High",
      "*** End of report ***",
    ];

    const tokens = tokensFromLines(lines);
    const { rows } = extractPageRows(tokens, 1);

    // Only 2 authentic rows extracted, interpretation table is ignored
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Hemoglobin");
    expect(rows[0].valueCell).toBe("14.2");
    expect(rows[1].name).toBe("Platelet Count");
    expect(rows[1].valueCell).toBe("240");

    // "Optimal" and "Above Optimal" must NOT be extracted as rows
    const optimalRow = rows.find((r) => r.name.toLowerCase().includes("optimal"));
    expect(optimalRow).toBeUndefined();
  });

  it("separates method line from test name without merging", () => {
    const lines = [
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "Hemoglobin    8.9 L*    g/dL    13.0 - 17.0",
      "Cyanide free spectrophotometry",
      "RBC Count    3.5 L*    10^6/μl    4.5 - 5.5",
      "Electrical impedance",
      "PCV    27.3 L*    %    40 - 50",
      "Calculated",
    ];

    const tokens = tokensFromLines(lines);
    const { rows } = extractPageRows(tokens, 1);

    expect(rows).toHaveLength(3);

    expect(rows[0].name).toBe("Hemoglobin");
    expect(rows[0].method).toBe("Cyanide free spectrophotometry");
    expect(rows[0].valueCell).toBe("8.9 L*");
    expect(rows[0].unitCell).toBe("g/dL");
    expect(rows[0].rangeCell).toBe("13.0 - 17.0");

    expect(rows[1].name).toBe("RBC Count");
    expect(rows[1].method).toBe("Electrical impedance");
    expect(rows[1].valueCell).toBe("3.5 L*");

    expect(rows[2].name).toBe("PCV");
    expect(rows[2].method).toBe("Calculated");
    expect(rows[2].valueCell).toBe("27.3 L*");
  });

  it("tracks section headings as context across rows", () => {
    const lines = [
      "Test Description    Value(s)    Unit(s)    Reference Range",
      "RBC Parameters",
      "Hemoglobin    14.0    g/dL    13.0 - 17.0",
      "WBC Parameters",
      "TLC    7.5    10^3/µl    4 - 10",
      "Differential Leucocyte Count",
      "Neutrophils    60    %    40 - 80",
      "Absolute Leukocyte Counts",
      "Neutrophils.    4.5    10^3/µl    2 - 7",
    ];

    const tokens = tokensFromLines(lines);
    const { rows } = extractPageRows(tokens, 1);

    expect(rows).toHaveLength(4);

    expect(rows[0].name).toBe("Hemoglobin");
    expect(rows[0].section).toBe("RBC Parameters");

    expect(rows[1].name).toBe("TLC");
    expect(rows[1].section).toBe("WBC Parameters");

    expect(rows[2].name).toBe("Neutrophils");
    expect(rows[2].section).toBe("Differential Leucocyte Count");

    expect(rows[3].name).toBe("Neutrophils.");
    expect(rows[3].section).toBe("Absolute Leukocyte Counts");
  });

  it("deduplicates rows repeated across a page break", () => {
    const page1: ExtractedPage = {
      pageNumber: 1,
      lines: [
        "Test Description    Value(s)    Unit(s)    Reference Range",
        "Total Cholesterol    185    mg/dL    < 200",
      ],
      fullText:
        "Test Description    Value(s)    Unit(s)    Reference Range\nTotal Cholesterol    185    mg/dL    < 200",
    };

    const page2: ExtractedPage = {
      pageNumber: 2,
      lines: [
        "Test Description    Value(s)    Unit(s)    Reference Range",
        "Total Cholesterol    185    mg/dL    < 200", // Repeated top of page 2
        "Triglycerides    140    mg/dL    < 150",
      ],
      fullText:
        "Test Description    Value(s)    Unit(s)    Reference Range\nTotal Cholesterol    185    mg/dL    < 200\nTriglycerides    140    mg/dL    < 150",
    };

    const extracted = extractAdaptiveTableRows([
      { pageNumber: 1, lines: page1.lines },
      { pageNumber: 2, lines: page2.lines },
    ]);

    expect(extracted).toHaveLength(2);
    expect(extracted[0].name).toBe("Total Cholesterol");
    expect(extracted[1].name).toBe("Triglycerides");
  });

  it("extracts all result rows on the 30-page example PDF yielding {name, method?, valueCell, unitCell, rangeCell, section}", async () => {
    const samplePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
    if (!fs.existsSync(samplePath)) {
      console.log("Sample PDF not found, skipping integration test.");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(samplePath));
    const pdf = await pdfjs.getDocument({ data, disableFontFace: true }).promise;

    const extractedPages: ExtractedPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
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

    const classification = classifyDocumentPages(extractedPages);
    const detailPages = classification.pagesToParse.map((p) => ({
      pageNumber: p.pageNumber,
      tokens: p.tokens || [],
      lines: p.lines,
    }));

    const rows = extractAdaptiveTableRows(detailPages);

    expect(rows.length).toBeGreaterThanOrEqual(70);

    // Verify every single row has the required layout structure
    for (const r of rows) {
      expect(typeof r.name).toBe("string");
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.valueCell).toBe("string");
      expect(r.valueCell.length).toBeGreaterThan(0);
      expect(typeof r.unitCell).toBe("string");
      expect(typeof r.rangeCell).toBe("string");
      if (r.method) {
        expect(typeof r.method).toBe("string");
        expect(r.method.length).toBeGreaterThan(0);
      }
      if (r.section) {
        expect(typeof r.section).toBe("string");
      }
    }

    // Spot-check Hemoglobin
    const hb = rows.find((r) => r.name.toLowerCase() === "hemoglobin");
    expect(hb).toBeDefined();
    expect(hb?.valueCell).toBe("8.9 L*");
    expect(hb?.unitCell).toBe("g/dL");
    expect(hb?.rangeCell).toBe("13.0 - 17.0");
    expect(hb?.method).toBe("Cyanide free spectrophotometry");
    expect(hb?.section).toBe("RBC Parameters");

    // Spot-check Absolute vs Differential Neutrophils
    const diffNeutro = rows.find(
      (r) => r.name.toLowerCase() === "neutrophils" && r.unitCell === "%"
    );
    expect(diffNeutro).toBeDefined();
    expect(diffNeutro?.section).toBe("Differential Leucocyte Count");
    expect(diffNeutro?.valueCell).toBe("58.5");

    const absNeutro = rows.find((r) => r.name.toLowerCase().startsWith("neutrophils."));
    expect(absNeutro).toBeDefined();
    expect(absNeutro?.section).toBe("Absolute Leukocyte Counts");
    expect(absNeutro?.valueCell).toBe("1.23 L*");

    // Ensure interpretation risk table entries were NOT parsed as results
    const bogusRisk = rows.find(
      (r) =>
        r.name.toLowerCase() === "optimal" ||
        r.name.toLowerCase() === "above optimal" ||
        r.name.toLowerCase() === "borderline high"
    );
    expect(bogusRisk).toBeUndefined();
  });

  it("inherits previous page columnBounds onto headerless continuation pages", () => {
    // Wide layout where values sit at x=315 (well past default 595pt valueXEnd=280)
    const page1Tokens: PositionedToken[] = [
      { str: "Test Description", x: 30, y: 760, width: 100, height: 10 },
      { str: "Value(s)", x: 310, y: 760, width: 50, height: 10 },
      { str: "Unit(s)", x: 420, y: 760, width: 40, height: 10 },
      { str: "Reference Range", x: 520, y: 760, width: 100, height: 10 },
      { str: "Hemoglobin", x: 30, y: 730, width: 70, height: 10 },
      { str: "14.5", x: 315, y: 730, width: 25, height: 10 },
      { str: "g/dL", x: 425, y: 730, width: 25, height: 10 },
      { str: "13.0 - 17.0", x: 525, y: 730, width: 65, height: 10 },
    ];

    // Continuation page omits the column header row completely
    const page2ContinuationTokens: PositionedToken[] = [
      { str: "Platelet Count", x: 30, y: 760, width: 80, height: 10 },
      { str: "245", x: 315, y: 760, width: 25, height: 10 },
      { str: "10^3/µL", x: 425, y: 760, width: 40, height: 10 },
      { str: "150 - 450", x: 525, y: 760, width: 60, height: 10 },
    ];

    const extracted = extractAdaptiveTableRows([
      { pageNumber: 1, tokens: page1Tokens },
      { pageNumber: 2, tokens: page2ContinuationTokens },
    ]);

    expect(extracted).toHaveLength(2);
    expect(extracted[1].name).toBe("Platelet Count");
    expect(extracted[1].valueCell).toBe("245");
    expect(extracted[1].unitCell).toBe("10^3/µL");
    expect(extracted[1].rangeCell).toBe("150 - 450");
  });
});
