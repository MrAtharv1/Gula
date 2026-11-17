import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadModal } from "../components/UploadModal";
import * as textExtractor from "../lib/parser/textExtractor";
import * as pageClassifier from "../lib/parser/pageClassifier";
import * as reportParser from "../lib/parser/reportParser";
import * as duplicateDetection from "../lib/db/duplicateDetection";
import * as db from "../lib/db";

// Mock sub-dependencies
vi.mock("../components/PdfPreview", () => ({
  PdfPreview: () => <div data-testid="pdf-preview-mock">PDF Preview</div>,
}));

vi.mock("../lib/db/duplicateDetection", () => ({
  checkForDuplicateReport: vi.fn().mockResolvedValue({ isDuplicate: false }),
}));

vi.mock("../lib/db", () => ({
  addReport: vi.fn().mockResolvedValue(1),
}));

describe("Phase 6: Upload UX for Long Reports", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload modal in pick step initially", () => {
    render(<UploadModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText("Upload report")).toBeDefined();
    expect(screen.getByText("Choose a PDF or drag it here")).toBeDefined();
  });

  it("handles long report extraction and shows review modal with date, info banner, and category grouping", async () => {
    // Mock 30-page extraction
    const mockPages: textExtractor.ExtractedPage[] = Array.from({ length: 30 }, (_, i) => ({
      pageNumber: i + 1,
      lines: [`Line 1 on page ${i + 1}`, `Line 2 on page ${i + 1}`],
      fullText: `Page ${i + 1} text`,
    }));

    vi.spyOn(textExtractor, "extractPdfText").mockResolvedValue({
      pages: mockPages,
      fullText: "Full document text",
    });

    vi.spyOn(pageClassifier, "classifyDocumentPages").mockReturnValue({
      pages: [],
      pagesToParse: mockPages.slice(13, 25), // 12 pages
      pages_used: [14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26],
      pages_skipped: [
        { pageNumber: 1, reason: "Wellness overview" },
        { pageNumber: 2, reason: "Cover page" },
      ],
      isScanned: false,
      hasResultPages: true,
      isFallbackSummary: false,
      totalTextLength: 1000,
    });

    const mockBiomarkers = [
      {
        id: "res-1",
        metricKey: "hemoglobin",
        canonicalKey: "hemoglobin",
        displayName: "Hemoglobin",
        value: 14.2,
        unit: "g/dL",
        flag: "normal" as const,
        category: "Blood" as const,
        confidence: 0.95,
        selected: true,
        source: "detail" as const,
      },
      {
        id: "res-2",
        metricKey: "rbc",
        canonicalKey: "rbc",
        displayName: "Red Blood Cell Count",
        value: 4.8,
        unit: "10^6/µl",
        flag: "normal" as const,
        category: "Blood" as const,
        confidence: 0.95,
        selected: true,
        source: "detail" as const,
      },
      {
        id: "res-3",
        metricKey: "glucose_fasting",
        canonicalKey: "glucose_fasting",
        displayName: "Glucose Fasting",
        value: 110,
        unit: "mg/dL",
        flag: "high" as const,
        category: "Sugar" as const,
        confidence: 0.95,
        selected: true,
        source: "summary" as const,
      },
    ];

    vi.spyOn(reportParser, "parseReportText").mockReturnValue({
      title: "Lab Test Report",
      date: "2026-09-05",
      reportDate: "2026-09-05",
      labName: "Redcliffe Labs",
      results: mockBiomarkers,
      biomarkers: mockBiomarkers,
      skippedLines: [],
      confidence: 0.95,
      errors: [],
      warnings: [],
      rawText: "Sample text",
      totalPages: 30,
      pages_used: [14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26],
      pages_skipped: [
        { pageNumber: 1, reason: "Wellness overview" },
        { pageNumber: 2, reason: "Cover page" },
      ],
    });

    const { container } = render(
      <UploadModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Simulate selecting a file
    const file = new File(["dummy pdf content"], "lab_report_long.pdf", {
      type: "application/pdf",
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const startTime = Date.now();
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Step 2: Preview -> click Submit
    await waitFor(() => {
      expect(screen.getByText("Ready to parse")).toBeDefined();
    });

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    // Wait for Review modal to open
    await waitFor(() => {
      expect(screen.getByText("Review report")).toBeDefined();
    });

    const elapsed = Date.now() - startTime;
    // Verification: opens in under 4s
    expect(elapsed).toBeLessThan(4000);

    // 1. Prominent extracted date display with pencil edit button
    expect(screen.getByText("2026-09-05")).toBeDefined();
    const editPencilBtn = screen.getByRole("button", { name: "Edit test date" });
    expect(editPencilBtn).toBeDefined();

    // Test editing date inline
    fireEvent.click(editPencilBtn);
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeDefined();
    fireEvent.change(dateInput, { target: { value: "2026-09-06" } });
    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);
    expect(screen.getByText("2026-09-06")).toBeDefined();

    // 2. Subtle info banner showing read vs skipped pages with expandable reasons
    expect(
      screen.getByText("Read 12 of 30 pages (2 non-result pages skipped)")
    ).toBeDefined();
    const viewDetailsBtn = screen.getByText("View details");
    expect(viewDetailsBtn).toBeDefined();

    fireEvent.click(viewDetailsBtn);
    expect(screen.getByText("Page 1")).toBeDefined();
    expect(screen.getByText("Wellness overview")).toBeDefined();

    // 3. Category grouping
    expect(screen.getByText("Blood")).toBeDefined();
    expect(screen.getByText("Sugar")).toBeDefined();
    expect(screen.getByText("Hemoglobin")).toBeDefined();
    expect(screen.getByText("Glucose Fasting")).toBeDefined();

    // 4. Clearly tag summary-only rows
    expect(screen.getByText("Summary")).toBeDefined();

    // 5. Category-level deselection checkbox
    const bloodCategoryCheckbox = screen.getByRole("checkbox", {
      name: "Select all Blood tests",
    });
    expect(bloodCategoryCheckbox).toBeDefined();
    expect((bloodCategoryCheckbox as HTMLInputElement).checked).toBe(true);

    // Deselect Blood category
    fireEvent.click(bloodCategoryCheckbox);
    expect((bloodCategoryCheckbox as HTMLInputElement).checked).toBe(false);

    // Only Sugar test remains selected (1 of 3 selected)
    expect(screen.getByText("1 of 3 tests selected")).toBeDefined();

    // Save results
    const importBtn = screen.getByRole("button", { name: "Import 1 result" });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(db.addReport).toHaveBeenCalledTimes(1);
    });

    // Verify report was saved with edited date and only the selected Sugar test
    const savedReportArgs = (db.addReport as any).mock.calls[0];
    expect(savedReportArgs[0].reportDate).toBe("2026-09-06");
    expect(savedReportArgs[1]).toHaveLength(1);
    expect(savedReportArgs[1][0].metricKey).toBe("glucose_fasting");
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });
});
