/**
 * Extracts structured line text from PDF documents using pdfjs-dist.
 * Groups spatial text items by Y coordinate to preserve tabular rows.
 */

export interface ExtractedPage {
  pageNumber: number;
  lines: string[];
  fullText: string;
}

export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<{ pages: ExtractedPage[]; fullText: string }> {
  // Dynamically import pdfjs-dist so it only loads on the client
  const pdfjsLib = await import("pdfjs-dist");

  // Configure worker for client-side processing
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pages: ExtractedPage[] = [];
  const fullTextParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    interface PositionedItem {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const items: PositionedItem[] = [];

    for (const item of content.items) {
      if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
        // In PDF coordinate space, transform = [scaleX, skewY, skewX, scaleY, transX, transY]
        const tx = item.transform[4];
        const ty = item.transform[5];
        items.push({
          str: item.str,
          x: tx,
          y: ty,
          width: item.width || 0,
          height: item.height || 0,
        });
      }
    }

    // Sort items vertically top-to-bottom (PDF Y starts at bottom, so descending Y)
    // and then horizontally left-to-right (ascending X)
    items.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff <= 4) {
        return a.x - b.x;
      }
      return b.y - a.y;
    });

    // Group items into lines
    const lineBuckets: PositionedItem[][] = [];
    let currentBucket: PositionedItem[] = [];
    let currentY: number | null = null;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= 4) {
        currentBucket.push(item);
        currentY = item.y;
      } else {
        if (currentBucket.length > 0) {
          // Sort items in this bucket from left to right
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

    const lines: string[] = lineBuckets.map((bucket) =>
      bucket.map((b) => b.str.trim()).join("  ")
    );

    const pageFullText = lines.join("\n");
    pages.push({
      pageNumber: i,
      lines,
      fullText: pageFullText,
    });
    fullTextParts.push(pageFullText);
  }

  return {
    pages,
    fullText: fullTextParts.join("\n\n"),
  };
}
