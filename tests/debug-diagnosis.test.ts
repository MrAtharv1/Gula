import { describe, it, expect } from "vitest";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { parsePdfText } from "../lib/parser/pdfParser";

describe("Phase 1 Diagnosis on Failing PDF", () => {
  it("diagnoses Praveen_Chauhan-1.pdf", async () => {
    const filePath = "C:\\Users\\intel\\Downloads\\Praveen_Chauhan-1.pdf";
    if (!fs.existsSync(filePath)) {
      console.log("File not found at", filePath);
      return;
    }

    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
    console.log("PDF loaded, total pages:", pdf.numPages);

    const pageStats: any[] = [];
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: any[] = [];
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
          items.push({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
          });
        }
      }

      items.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff <= 4) return a.x - b.x;
        return b.y - a.y;
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

      const lines = lineBuckets.map((b) => b.map((x) => x.str.trim()).join("  "));
      const pageText = lines.join("\n");
      fullText += pageText + "\n\n";

      // Classify page
      let detectedType = "SKIP";
      const hasDetailHeader =
        /(?:test description|test name|investigation|parameter)/i.test(pageText) &&
        /(?:value|result)/i.test(pageText) &&
        /unit/i.test(pageText) &&
        /(?:reference|range|normal)/i.test(pageText);

      const hasSummaryHeader =
        /(?:test name|parameter)/i.test(pageText) &&
        /result/i.test(pageText) &&
        /range/i.test(pageText) &&
        !/unit/i.test(pageText);

      const isSkipKeyword =
        /terms and conditions|roadmap|health score|download the app|scan qr|peak name|about redcliffe|wellness overview|doctor clinical overview/i.test(
          pageText
        );

      if (hasDetailHeader) {
        detectedType = "RESULT_DETAIL";
      } else if (hasSummaryHeader) {
        detectedType = "RESULT_SUMMARY";
      } else if (isSkipKeyword) {
        detectedType = "SKIP";
      }

      pageStats.push({
        page: i,
        length: pageText.length,
        linesCount: lines.length,
        detectedType,
        firstLine: lines[0] || "",
      });
    }

    console.log("Page Breakdown:");
    pageStats.forEach((p) => {
      console.log(
        `P${p.page}: ${p.detectedType} | len=${p.length} | lines=${p.linesCount} | sample="${p.firstLine.slice(0, 40)}"`
      );
    });

    const parsed = parsePdfText(fullText, pdf.numPages);
    console.log("Current parser extracted:", parsed.results.length, "results");
    console.log("Current parser skipped lines count:", parsed.skippedLines.length);
    console.log("Current parser warnings/errors:", parsed.errors);
    console.log(
      "Extracted keys:",
      parsed.results.map((r) => r.canonicalKey)
    );
  });
});
