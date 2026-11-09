import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "fake-indexeddb/auto";
import { UploadModal } from "@/components/UploadModal";
import { checkForDuplicateReport } from "@/lib/db/duplicateDetection";
import { addReport, deleteAllData } from "@/lib/db";
import { parseReportText } from "@/lib/parser/reportParser";

describe("Phase 2: Upload Flow Validations & Duplicate Detection", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("validates file type and rejects non-PDF files", async () => {
    render(<UploadModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const nonPdfFile = new File(["dummy image"], "photo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [nonPdfFile] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a PDF file.")).toBeDefined();
    });
  });

  it("validates file size and rejects files over 20 MB", async () => {
    render(<UploadModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Create 21 MB dummy file
    const largeFile = new File(["a".repeat(100)], "huge_lab_report.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(largeFile, "size", { value: 21 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText("File is too large. Max 20 MB.")).toBeDefined();
    });
  });

  it("detects duplicate reports with same date and matching biomarker values", async () => {
    // Add initial report
    await addReport(
      {
        fileName: "Quest_March2024.pdf",
        reportDate: "2024-03-15",
        uploadedAt: Date.now(),
        status: "active",
        parseWarnings: [],
      },
      [
        {
          metricKey: "glucose_fasting",
          displayName: "Glucose",
          value: 95,
          unit: "mg/dL",
          flag: "normal",
          category: "Sugar",
        },
        {
          metricKey: "cholesterol_total",
          displayName: "Cholesterol",
          value: 190,
          unit: "mg/dL",
          flag: "normal",
          category: "Lipids",
        },
      ]
    );

    // Check duplicate with matching values on same date
    const dupCheck1 = await checkForDuplicateReport("2024-03-15", [
      { metricKey: "glucose_fasting", value: 95 },
      { metricKey: "cholesterol_total", value: 190 },
    ]);
    expect(dupCheck1.isDuplicate).toBe(true);

    // Check with different date -> not duplicate
    const dupCheck2 = await checkForDuplicateReport("2024-09-20", [
      { metricKey: "glucose_fasting", value: 95 },
      { metricKey: "cholesterol_total", value: 190 },
    ]);
    expect(dupCheck2.isDuplicate).toBe(false);
  });

  it("detects when no test results can be parsed from text", () => {
    const randomText = `
      Invoice Number: 983241
      Thank you for choosing our hospital.
      Please pay the cashier at front desk.
    `;
    const result = parseReportText(randomText);
    expect(result.biomarkers.length).toBe(0);
    expect(result.warnings).toContain("We couldn't find any test results in this file.");
  });

  it("tracks unparseable lines for partial success reporting", () => {
    const mixedText = `
      Quest Diagnostics
      Collection Date: 05/10/2024
      GLUCOSE, FASTING      92   mg/dL   70 - 99
      Unknown Weird Test    42   XYZ     Not Available
      HEMOGLOBIN            15.0 g/dL    13.5 - 17.5
    `;
    const result = parseReportText(mixedText);
    expect(result.biomarkers.length).toBeGreaterThanOrEqual(2);
    // Unparsed lines with numbers are preserved
    expect(result.skippedLines.length).toBeGreaterThanOrEqual(1);
    expect(result.skippedLines.some((l) => l.includes("Unknown Weird Test"))).toBe(true);
  });
});
