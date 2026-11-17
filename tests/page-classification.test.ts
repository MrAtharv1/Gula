import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  classifyPage,
  classifyDocumentPages,
} from "../lib/parser/pageClassifier";
import { parsePdfText } from "../lib/parser/pdfParser";
import { ExtractedPage } from "../lib/parser/textExtractor";

describe("Phase 2: Page Classification", () => {
  it("classifies synthetic RESULT_DETAIL page with 4 columns and result rows", () => {
    const page: ExtractedPage = {
      pageNumber: 1,
      lines: [
        "Patient NAME : John Doe",
        "Test Description    Value(s)    Unit(s)    Reference Range",
        "Hemoglobin    14.2    g/dL    13.0 - 17.0",
        "Cyanide free spectrophotometry",
        "Platelet Count    240    10^3/µl    150 - 450",
      ],
      fullText:
        "Patient NAME : John Doe\nTest Description    Value(s)    Unit(s)    Reference Range\nHemoglobin    14.2    g/dL    13.0 - 17.0\nCyanide free spectrophotometry\nPlatelet Count    240    10^3/µl    150 - 450",
    };

    const res = classifyPage(page);
    expect(res.classification).toBe("RESULT_DETAIL");
    expect(res.valueRowCount).toBeGreaterThanOrEqual(2);
  });

  it("classifies synthetic RESULT_SUMMARY page with 3 columns (no separate unit column)", () => {
    const page: ExtractedPage = {
      pageNumber: 2,
      lines: [
        "DOCTOR CLINICAL OVERVIEW",
        "Test Name    Result    Range",
        "Hemoglobin    8.9 g/dL    13 - 17",
        "TLC    2.1 10^3/µl    4 - 10",
      ],
      fullText:
        "DOCTOR CLINICAL OVERVIEW\nTest Name    Result    Range\nHemoglobin    8.9 g/dL    13 - 17\nTLC    2.1 10^3/µl    4 - 10",
    };

    const res = classifyPage(page);
    expect(res.classification).toBe("RESULT_SUMMARY");
  });

  it("classifies INTERPRETATION_ONLY page when detail header exists but 0 test rows exist", () => {
    const page: ExtractedPage = {
      pageNumber: 3,
      lines: [
        "Patient NAME : Jane Doe",
        "Test Description    Value(s)    Unit(s)    Reference Range",
        "<40    >=60",
        "Risk Stratification for ASCVD by Lipid Association of India.",
        "Optimal: < 100 mg/dL",
        "Near optimal: 100 - 129 mg/dL",
      ],
      fullText:
        "Patient NAME : Jane Doe\nTest Description    Value(s)    Unit(s)    Reference Range\n<40    >=60\nRisk Stratification for ASCVD by Lipid Association of India.\nOptimal: < 100 mg/dL\nNear optimal: 100 - 129 mg/dL",
    };

    const res = classifyPage(page);
    expect(res.classification).toBe("INTERPRETATION_ONLY");
    expect(res.valueRowCount).toBe(0);
  });

  it("classifies SKIP pages for marketing, cover, roadmap, chromatogram, and terms", () => {
    const chromatogramPage: ExtractedPage = {
      pageNumber: 4,
      lines: [
        "Bio-Rad Variant II",
        "Peak Name    RT (sec)    Area    Area%    Concentration (% NGSP)",
        "A1a    5.65    701.31    0.84    ---",
      ],
      fullText:
        "Bio-Rad Variant II\nPeak Name    RT (sec)    Area    Area%    Concentration (% NGSP)\nA1a    5.65    701.31    0.84    ---",
    };
    expect(classifyPage(chromatogramPage).classification).toBe("SKIP");

    const termsPage: ExtractedPage = {
      pageNumber: 5,
      lines: [
        "TERMS AND CONDITIONS",
        "This report must be read in conjunction with the patient's clinical history.",
      ],
      fullText:
        "TERMS AND CONDITIONS\nThis report must be read in conjunction with the patient's clinical history.",
    };
    expect(classifyPage(termsPage).classification).toBe("SKIP");

    const roadmapPage: ExtractedPage = {
      pageNumber: 6,
      lines: [
        "YOUR PERSONAL HEALTH ROADMAP",
        "Follow these recommendations to improve your health score.",
      ],
      fullText:
        "YOUR PERSONAL HEALTH ROADMAP\nFollow these recommendations to improve your health score.",
    };
    expect(classifyPage(roadmapPage).classification).toBe("SKIP");
  });

  it("prioritizes RESULT_DETAIL over RESULT_SUMMARY, skipping summary pages", () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        lines: [
          "DOCTOR OVERVIEW",
          "Test Name    Result    Range",
          "Glucose    95 mg/dL    70 - 100",
        ],
        fullText: "DOCTOR OVERVIEW\nTest Name    Result    Range\nGlucose    95 mg/dL    70 - 100",
      },
      {
        pageNumber: 2,
        lines: [
          "LAB REPORT",
          "Test Description    Value(s)    Unit(s)    Reference Range",
          "Glucose Fasting    92.5    mg/dL    70.0 - 99.0",
        ],
        fullText:
          "LAB REPORT\nTest Description    Value(s)    Unit(s)    Reference Range\nGlucose Fasting    92.5    mg/dL    70.0 - 99.0",
      },
    ];

    const classified = classifyDocumentPages(pages);
    expect(classified.isFallbackSummary).toBe(false);
    expect(classified.pages_used).toEqual([2]);
    expect(classified.pages_skipped).toHaveLength(1);
    expect(classified.pages_skipped[0].pageNumber).toBe(1);

    const parsed = parsePdfText({ pages });
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].source).toBe("detail");
    expect(parsed.results[0].value).toBe(92.5);
    expect(parsed.warnings?.includes("Ranges may be simplified.")).toBe(false);
  });

  it("falls back to RESULT_SUMMARY when no RESULT_DETAIL page exists, tagging source and warning", () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        lines: [
          "CLINICAL SUMMARY",
          "Test Name    Result    Range",
          "Fasting Glucose    95    mg/dL    70 - 100",
        ],
        fullText: "CLINICAL SUMMARY\nTest Name    Result    Range\nFasting Glucose    95    mg/dL    70 - 100",
      },
    ];

    const classified = classifyDocumentPages(pages);
    expect(classified.isFallbackSummary).toBe(true);
    expect(classified.pages_used).toEqual([1]);

    const parsed = parsePdfText({ pages });
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].source).toBe("summary");
    expect(parsed.warnings).toContain("Ranges may be simplified.");
  });

  it("does not detect scanned copy from page 1 alone when later pages contain text", () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        lines: ["Cover"],
        fullText: "Cover",
      },
      {
        pageNumber: 2,
        lines: [
          "Test Description    Value(s)    Unit(s)    Reference Range",
          "Hemoglobin    15.0    g/dL    13.0 - 17.0",
        ],
        fullText:
          "Test Description    Value(s)    Unit(s)    Reference Range\nHemoglobin    15.0    g/dL    13.0 - 17.0",
      },
    ];

    const classified = classifyDocumentPages(pages);
    expect(classified.isScanned).toBe(false);
    expect(classified.pages_used).toEqual([2]);
  });

  it("returns error when zero result pages exist but text is present", () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        lines: [
          "TERMS AND CONDITIONS",
          "General laboratory disclaimer and guidelines for testing.",
        ],
        fullText: "TERMS AND CONDITIONS\nGeneral laboratory disclaimer and guidelines for testing.",
      },
      {
        pageNumber: 2,
        lines: [
          "YOUR PERSONAL HEALTH ROADMAP",
          "Consult your physician for personalized dietary guidance.",
        ],
        fullText: "YOUR PERSONAL HEALTH ROADMAP\nConsult your physician for personalized dietary guidance.",
      },
    ];

    const parsed = parsePdfText({ pages });
    expect(parsed.results).toHaveLength(0);
    expect(parsed.errors).toContain("We couldn't find a results table in this file.");
    expect(parsed.pages_used).toHaveLength(0);
    expect(parsed.pages_skipped).toHaveLength(2);
  });

  it("resolves the 30-page example PDF to exactly 12 result pages and skips the remaining 18", async () => {
    const samplePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
    if (!fs.existsSync(samplePath)) {
      console.log("Sample PDF not found, skipping local file integration test.");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(samplePath));
    const pdf = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
    expect(pdf.numPages).toBe(30);

    const extractedPages: ExtractedPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items as any[]).filter(
        (it: any) => it.str && typeof it.str === "string" && it.str.trim().length > 0
      );

      items.sort((a: any, b: any) => {
        const yDiff = Math.abs(a.transform[5] - b.transform[5]);
        if (yDiff <= 4) return a.transform[4] - b.transform[4];
        return b.transform[5] - a.transform[5];
      });

      const lineBuckets: any[][] = [];
      let currentBucket: any[] = [];
      let currentY: number | null = null;
      for (const item of items) {
        if (currentY === null || Math.abs(item.transform[5] - currentY) <= 4) {
          currentBucket.push(item);
          currentY = item.transform[5];
        } else {
          if (currentBucket.length > 0) {
            currentBucket.sort((a, b) => a.transform[4] - b.transform[4]);
            lineBuckets.push(currentBucket);
          }
          currentBucket = [item];
          currentY = item.transform[5];
        }
      }
      if (currentBucket.length > 0) {
        currentBucket.sort((a, b) => a.transform[4] - b.transform[4]);
        lineBuckets.push(currentBucket);
      }

      const lines = lineBuckets.map((b) => b.map((x) => x.str.trim()).join("    "));
      extractedPages.push({
        pageNumber: i,
        lines,
        fullText: lines.join("\n"),
      });
    }

    const classification = classifyDocumentPages(extractedPages);

    // Exactly 12 RESULT_DETAIL pages
    expect(classification.pages_used).toHaveLength(12);
    expect(classification.pages_used).toEqual([
      14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26,
    ]);

    // Exactly 18 skipped pages with reasons (12 + 18 = 30)
    expect(classification.pages_skipped).toHaveLength(18);

    // Page 23 and 27 are specifically INTERPRETATION_ONLY
    const p23 = classification.pages.find((p) => p.pageNumber === 23);
    const p27 = classification.pages.find((p) => p.pageNumber === 27);
    expect(p23?.classification).toBe("INTERPRETATION_ONLY");
    expect(p27?.classification).toBe("INTERPRETATION_ONLY");

    // Page 28 is chromatogram SKIP
    const p28 = classification.pages.find((p) => p.pageNumber === 28);
    expect(p28?.classification).toBe("SKIP");

    // Parse with document pages object
    const parsed = parsePdfText({ pages: extractedPages });
    expect(parsed.pages_used).toHaveLength(12);
    expect(parsed.pages_skipped).toHaveLength(18);
  });
});
