/**
 * Extracts structured line text from PDF documents using pdfjs-dist.
 * Groups spatial text items by Y coordinate to preserve tabular rows.
 */

export interface PositionedToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedPage {
  pageNumber: number;
  lines: string[];
  fullText: string;
  tokens?: PositionedToken[];
}

export async function extractPdfText(
  input: ArrayBuffer | Uint8Array | Blob | string
): Promise<{ pages: ExtractedPage[]; fullText: string }> {
  // Dynamically import pdfjs-dist so it only loads on the client
  const pdfjsLib = await import("pdfjs-dist");

  // Configure worker for client-side processing
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  let loadingTask: any;
  let tempBlobUrl: string | null = null;

  if (typeof input === "string") {
    loadingTask = pdfjsLib.getDocument({
      url: input,
      useSystemFonts: true,
    });
  } else if (typeof Blob !== "undefined" && input instanceof Blob) {
    tempBlobUrl = URL.createObjectURL(input);
    loadingTask = pdfjsLib.getDocument({
      url: tempBlobUrl,
      useSystemFonts: true,
    });
  } else {
    // ArrayBuffer or Uint8Array
    const rawBuffer = input as ArrayBuffer | Uint8Array;
    if (
      !rawBuffer ||
      (rawBuffer as any).detached ||
      (rawBuffer instanceof Uint8Array && (rawBuffer.buffer as any).detached) ||
      rawBuffer.byteLength === 0
    ) {
      throw new Error("Cannot extract text: document buffer is detached or empty.");
    }

    if (
      typeof Blob !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function"
    ) {
      const blob = new Blob([rawBuffer as any], { type: "application/pdf" });
      tempBlobUrl = URL.createObjectURL(blob);
      loadingTask = pdfjsLib.getDocument({
        url: tempBlobUrl,
        useSystemFonts: true,
      });
    } else {
      const bufferCopy =
        rawBuffer instanceof Uint8Array ? rawBuffer.slice() : rawBuffer.slice(0);
      loadingTask = pdfjsLib.getDocument({
        data: bufferCopy,
        useSystemFonts: true,
      });
    }
  }

  try {
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
      tokens: items,
    });
    fullTextParts.push(pageFullText);
  }

  return {
    pages,
    fullText: fullTextParts.join("\n\n"),
  };
  } finally {
    if (tempBlobUrl) {
      try {
        URL.revokeObjectURL(tempBlobUrl);
      } catch {}
    }
  }
}
