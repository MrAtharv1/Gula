import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SingleMetricTrendsView,
  classifyBiomarkerStatus,
  getReadingColorDetails,
  TrendSparkline,
  ResultPill,
} from "@/components/SingleMetricTrendsView";
import { LatestResultSummary, Report, ResultWithDate } from "@/lib/db/schema";

describe("Single Metric Trends View (Biotracker style)", () => {
  const mockReports: Report[] = [
    {
      id: 1,
      fileName: "Report_Nov_2022.pdf",
      reportDate: "2022-11-09",
      uploadedAt: 1667952000000,
      status: "active",
      parseWarnings: [],
    },
    {
      id: 2,
      fileName: "Report_May_2024.pdf",
      reportDate: "2024-05-29",
      uploadedAt: 1716940800000,
      status: "active",
      parseWarnings: [],
    },
    {
      id: 3,
      fileName: "Report_Nov_2024.pdf",
      reportDate: "2024-11-25",
      uploadedAt: 1732492800000,
      status: "active",
      parseWarnings: [],
    },
  ];

  const mockSummaries: LatestResultSummary[] = [
    // 1. Albumin: High (5.2), was 4.94 (normal), was 5.2 (high) -> Need attention & worsen
    {
      metricKey: "albumin",
      displayName: "Albumin",
      category: "Liver",
      standardUnit: "g/dL",
      latestResult: {
        id: 103,
        reportId: 3,
        metricKey: "albumin",
        displayName: "Albumin",
        value: 5.2,
        unit: "g/dL",
        refLow: 3.5,
        refHigh: 5.0,
        flag: "high",
        category: "Liver",
        reportDate: "2024-11-25",
        fileName: "Report_Nov_2024.pdf",
      },
      previousResult: {
        id: 102,
        reportId: 2,
        metricKey: "albumin",
        displayName: "Albumin",
        value: 4.94,
        unit: "g/dL",
        refLow: 3.5,
        refHigh: 5.0,
        flag: "normal",
        category: "Liver",
        reportDate: "2024-05-29",
        fileName: "Report_May_2024.pdf",
      },
      historyCount: 3,
      history: [
        {
          id: 101,
          reportId: 1,
          metricKey: "albumin",
          displayName: "Albumin",
          value: 5.2,
          unit: "g/dL",
          refLow: 3.5,
          refHigh: 5.0,
          flag: "high",
          category: "Liver",
          reportDate: "2022-11-09",
          fileName: "Report_Nov_2022.pdf",
        },
        {
          id: 102,
          reportId: 2,
          metricKey: "albumin",
          displayName: "Albumin",
          value: 4.94,
          unit: "g/dL",
          refLow: 3.5,
          refHigh: 5.0,
          flag: "normal",
          category: "Liver",
          reportDate: "2024-05-29",
          fileName: "Report_May_2024.pdf",
        },
        {
          id: 103,
          reportId: 3,
          metricKey: "albumin",
          displayName: "Albumin",
          value: 5.2,
          unit: "g/dL",
          refLow: 3.5,
          refHigh: 5.0,
          flag: "high",
          category: "Liver",
          reportDate: "2024-11-25",
          fileName: "Report_Nov_2024.pdf",
        },
      ],
    },
    // 2. Fasting Glucose: High (120), was 160 (high) -> Need attention but improved!
    {
      metricKey: "glucose_fasting",
      displayName: "Fasting Blood Glucose",
      category: "Sugar",
      standardUnit: "mg/dL",
      latestResult: {
        id: 202,
        reportId: 3,
        metricKey: "glucose_fasting",
        displayName: "Fasting Blood Glucose",
        value: 120,
        unit: "mg/dL",
        refLow: 70,
        refHigh: 99,
        flag: "high",
        category: "Sugar",
        reportDate: "2024-11-25",
        fileName: "Report_Nov_2024.pdf",
      },
      previousResult: {
        id: 201,
        reportId: 2,
        metricKey: "glucose_fasting",
        displayName: "Fasting Blood Glucose",
        value: 160,
        unit: "mg/dL",
        refLow: 70,
        refHigh: 99,
        flag: "high",
        category: "Sugar",
        reportDate: "2024-05-29",
        fileName: "Report_May_2024.pdf",
      },
      historyCount: 2,
      history: [
        {
          id: 201,
          reportId: 2,
          metricKey: "glucose_fasting",
          displayName: "Fasting Blood Glucose",
          value: 160,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "high",
          category: "Sugar",
          reportDate: "2024-05-29",
          fileName: "Report_May_2024.pdf",
        },
        {
          id: 202,
          reportId: 3,
          metricKey: "glucose_fasting",
          displayName: "Fasting Blood Glucose",
          value: 120,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "high",
          category: "Sugar",
          reportDate: "2024-11-25",
          fileName: "Report_Nov_2024.pdf",
        },
      ],
    },
    // 3. HbA1c: Borderline (5.7 %), ref 4.0-5.6 -> Within border range
    {
      metricKey: "hba1c",
      displayName: "Hemoglobin A1c",
      category: "Sugar",
      standardUnit: "%",
      latestResult: {
        id: 301,
        reportId: 3,
        metricKey: "hba1c",
        displayName: "Hemoglobin A1c",
        value: 5.7,
        unit: "%",
        refLow: 4.0,
        refHigh: 5.6,
        flag: "borderline",
        category: "Sugar",
        reportDate: "2024-11-25",
        fileName: "Report_Nov_2024.pdf",
      },
      historyCount: 1,
      history: [
        {
          id: 301,
          reportId: 3,
          metricKey: "hba1c",
          displayName: "Hemoglobin A1c",
          value: 5.7,
          unit: "%",
          refLow: 4.0,
          refHigh: 5.6,
          flag: "borderline",
          category: "Sugar",
          reportDate: "2024-11-25",
          fileName: "Report_Nov_2024.pdf",
        },
      ],
    },
    // 4. Bilirubin, Total: Normal (0.4 mg/dL), ref 0.2-1.2 -> Normal
    {
      metricKey: "bilirubin_total",
      displayName: "Bilirubin, Total",
      category: "Liver",
      standardUnit: "mg/dL",
      latestResult: {
        id: 401,
        reportId: 3,
        metricKey: "bilirubin_total",
        displayName: "Bilirubin, Total",
        value: 0.4,
        unit: "mg/dL",
        refLow: 0.2,
        refHigh: 1.2,
        flag: "normal",
        category: "Liver",
        reportDate: "2024-11-25",
        fileName: "Report_Nov_2024.pdf",
      },
      historyCount: 1,
      history: [
        {
          id: 401,
          reportId: 3,
          metricKey: "bilirubin_total",
          displayName: "Bilirubin, Total",
          value: 0.4,
          unit: "mg/dL",
          refLow: 0.2,
          refHigh: 1.2,
          flag: "normal",
          category: "Liver",
          reportDate: "2024-11-25",
          fileName: "Report_Nov_2024.pdf",
        },
      ],
    },
  ];

  /* ------------------------------------------------------------------
   * 1. Status Classifier Tests
   * ------------------------------------------------------------------ */
  describe("Biomarker Status Classification", () => {
    it("classifies improved high metric (dropped towards normal) as attention_improved", () => {
      const glucose = mockSummaries[1]; // 160 -> 120 (ref 70-99)
      const res = classifyBiomarkerStatus(glucose);
      expect(res.isAttentionImproved).toBe(true);
      expect(res.isAttentionWorsen).toBe(false);
      expect(res.needsAttention).toBe(true);
    });

    it("classifies worsened high metric (rose away from normal) as attention_worsen", () => {
      const albumin = mockSummaries[0]; // 4.94 (normal) -> 5.2 (high)
      const res = classifyBiomarkerStatus(albumin);
      expect(res.isAttentionWorsen).toBe(true);
      expect(res.isAttentionImproved).toBe(false);
      expect(res.needsAttention).toBe(true);
    });

    it("classifies borderline result as border_range", () => {
      const hba1c = mockSummaries[2]; // 5.7 % (flag: borderline)
      const res = classifyBiomarkerStatus(hba1c);
      expect(res.isBorderRange).toBe(true);
    });
  });

  /* ------------------------------------------------------------------
   * 2. UI Component Rendering Tests
   * ------------------------------------------------------------------ */
  describe("UI Rendering and Category Accordions", () => {
    it("renders search bar, panel selector, and 4 checkbox filters", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      expect(screen.getByPlaceholderText("Search for a biomarker...")).toBeDefined();
      expect(screen.getByText("All Panels")).toBeDefined();
      expect(screen.getByText("Filters:")).toBeDefined();

      // The 4 Checkboxes
      expect(screen.getByText("All")).toBeDefined();
      expect(screen.getByText("Need attention but improved")).toBeDefined();
      expect(screen.getByText("Need attention and worsen")).toBeDefined();
      expect(screen.getByText("Within border range")).toBeDefined();
    });

    it("renders panels with collapsible accordion headers", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      // Category panel headers
      expect(screen.getByRole("heading", { name: /liver function/i })).toBeDefined();
      expect(screen.getByRole("heading", { name: /metabolic panel/i })).toBeDefined();

      // Biomarkers displayed
      expect(screen.getAllByText("Albumin").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Hemoglobin A1c").length).toBeGreaterThanOrEqual(1);
    });

    it("collapses and expands panel when header clicked", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      const liverPanelBtn = screen.getByRole("button", { name: /liver function/i });
      expect(liverPanelBtn).not.toBeNull();
      expect(liverPanelBtn?.getAttribute("aria-expanded")).toBe("true");

      // Click to collapse
      fireEvent.click(liverPanelBtn!);
      expect(liverPanelBtn?.getAttribute("aria-expanded")).toBe("false");

      // Click to expand again
      fireEvent.click(liverPanelBtn!);
      expect(liverPanelBtn?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  /* ------------------------------------------------------------------
   * 3. Checkbox Filter Multi-Select Logic
   * ------------------------------------------------------------------ */
  describe("Checkbox Filters Multi-Select", () => {
    it("filters to 'Need attention but improved' when checked", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      const improvedCheckbox = screen
        .getByText("Need attention but improved")
        .closest("label")
        ?.querySelector("input");
      expect(improvedCheckbox).not.toBeNull();

      fireEvent.click(improvedCheckbox!);

      // Only Fasting Glucose improved
      expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Albumin")).toBeNull();
      expect(screen.queryByText("Bilirubin, Total")).toBeNull();
    });

    it("supports multi-selecting 'improved' AND 'worsen' simultaneously", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      const improvedCheckbox = screen
        .getByText("Need attention but improved")
        .closest("label")
        ?.querySelector("input");

      const worsenCheckbox = screen
        .getByText("Need attention and worsen")
        .closest("label")
        ?.querySelector("input");

      // Check improved
      fireEvent.click(improvedCheckbox!);
      // Check worsen
      fireEvent.click(worsenCheckbox!);

      // Both should appear
      expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Albumin").length).toBeGreaterThanOrEqual(1);
      // Normal Bilirubin should NOT appear
      expect(screen.queryByText("Bilirubin, Total")).toBeNull();
    });

    it("reverts to All when 'All' is clicked", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      const worsenCheckbox = screen
        .getByText("Need attention and worsen")
        .closest("label")
        ?.querySelector("input");
      fireEvent.click(worsenCheckbox!);

      expect(screen.queryByText("Bilirubin, Total")).toBeNull();

      // Click All
      const allCheckbox = screen
        .getByText("All")
        .closest("label")
        ?.querySelector("input");
      fireEvent.click(allCheckbox!);

      // All biomarkers are back
      expect(screen.getAllByText("Bilirubin, Total").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Albumin").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ------------------------------------------------------------------
   * 4. Search and Open Detail Callback
   * ------------------------------------------------------------------ */
  describe("Search and Detail Trigger", () => {
    it("filters biomarkers by search text", () => {
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search for a biomarker...");
      fireEvent.change(searchInput, { target: { value: "albumin" } });

      expect(screen.getAllByText("Albumin").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Fasting Blood Glucose")).toBeNull();
    });

    it("calls onOpenDetail when biomarker name is clicked", () => {
      const handleOpen = vi.fn();
      render(
        <SingleMetricTrendsView
          summaries={mockSummaries}
          reports={mockReports}
          onOpenDetail={handleOpen}
        />
      );

      const albuminBtn = screen.getAllByText("Albumin")[0];
      fireEvent.click(albuminBtn);

      expect(handleOpen).toHaveBeenCalledTimes(1);
      expect(handleOpen).toHaveBeenCalledWith(
        expect.objectContaining({ metricKey: "albumin" })
      );
    });
  });

  /* ------------------------------------------------------------------
   * 5. Sparkline & ResultPill Helpers
   * ------------------------------------------------------------------ */
  describe("Sparkline and ResultPill Sub-components", () => {
    it("renders ResultPill with up arrow for high and checkmark for normal", () => {
      const highResult: ResultWithDate = {
        id: 1,
        reportId: 1,
        metricKey: "albumin",
        displayName: "Albumin",
        value: 5.2,
        unit: "g/dL",
        flag: "high",
        category: "Liver",
        reportDate: "2024-11-25",
        fileName: "R.pdf",
      };

      const normalResult: ResultWithDate = {
        id: 2,
        reportId: 1,
        metricKey: "albumin",
        displayName: "Albumin",
        value: 4.8,
        unit: "g/dL",
        flag: "normal",
        category: "Liver",
        reportDate: "2024-05-29",
        fileName: "R.pdf",
      };

      const { container: c1 } = render(<ResultPill result={highResult} />);
      expect(c1.textContent).toContain("5.2");
      expect(c1.textContent).toContain("g/dL");

      const { container: c2 } = render(<ResultPill result={normalResult} />);
      expect(c2.textContent).toContain("4.8");
      expect(c2.textContent).toContain("g/dL");

      const { container: c3 } = render(<ResultPill result={undefined} />);
      expect(c3.textContent).toBe("-");
    });

    it("renders SVG sparkline for multi-point history", () => {
      const history: ResultWithDate[] = [
        {
          id: 1,
          reportId: 1,
          metricKey: "albumin",
          displayName: "Albumin",
          value: 4.5,
          unit: "g/dL",
          flag: "normal",
          category: "Liver",
          reportDate: "2022-11-09",
          fileName: "R1.pdf",
        },
        {
          id: 2,
          reportId: 2,
          metricKey: "albumin",
          displayName: "Albumin",
          value: 5.2,
          unit: "g/dL",
          flag: "high",
          category: "Liver",
          reportDate: "2024-11-25",
          fileName: "R2.pdf",
        },
      ];

      const { container } = render(
        <TrendSparkline history={history} refLow={3.5} refHigh={5.0} />
      );
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      const path = container.querySelector("path");
      expect(path).not.toBeNull();
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBe(2);
    });

    it("dynamically shades dots from light red to dark red as distance from border increases", () => {
      // Fasting glucose (ref: 70-99 mg/dL)
      // 1. Barely high: 101 mg/dL (close to border: lighter red)
      const mildHigh = getReadingColorDetails(101, 70, 99, "high");
      expect(mildHigh.dotColor).toContain("hsl(0, 85%,");
      // Extract lightness percentage
      const mildLightness = parseInt(mildHigh.dotColor.match(/(\d+)%\)/)?.[1] || "0", 10);

      // 2. Severely high: 260 mg/dL (far from border: darker red)
      const severeHigh = getReadingColorDetails(260, 70, 99, "high");
      const severeLightness = parseInt(severeHigh.dotColor.match(/(\d+)%\)/)?.[1] || "0", 10);

      // Lighter red has higher lightness percentage than dark red
      expect(mildLightness).toBeGreaterThan(severeLightness);
    });

    it("dynamically shades border range dots from light orange to dark orange", () => {
      // Fasting glucose (ref: 70-99 mg/dL)
      // Value right near normal boundary (light orange) vs right on the out-of-range edge (dark orange)
      const borderNearNormal = getReadingColorDetails(95, 70, 99, "borderline");
      const borderNearEdge = getReadingColorDetails(101, 70, 99, "borderline");

      expect(borderNearNormal.dotColor).toContain("hsl(");
      expect(borderNearEdge.dotColor).toContain("hsl(");

      const normalLightness = parseInt(borderNearNormal.dotColor.match(/(\d+)%\)/)?.[1] || "0", 10);
      const edgeLightness = parseInt(borderNearEdge.dotColor.match(/(\d+)%\)/)?.[1] || "0", 10);

      expect(normalLightness).toBeGreaterThanOrEqual(edgeLightness);
    });

    it("evaluates out of range and improved over the last 5 reports window", () => {
      // 5 reports: was high in report 2, second last was 150, latest is 115 (closer to normal 70-99)
      const fiveReportsSummary: LatestResultSummary = {
        metricKey: "glucose_fasting",
        displayName: "Fasting Blood Glucose",
        category: "Sugar",
        standardUnit: "mg/dL",
        latestResult: {
          id: 5,
          reportId: 5,
          metricKey: "glucose_fasting",
          displayName: "Fasting Blood Glucose",
          value: 115,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "high",
          category: "Sugar",
          reportDate: "2024-11-01",
          fileName: "R5.pdf",
        },
        previousResult: {
          id: 4,
          reportId: 4,
          metricKey: "glucose_fasting",
          displayName: "Fasting Blood Glucose",
          value: 150,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "high",
          category: "Sugar",
          reportDate: "2024-08-01",
          fileName: "R4.pdf",
        },
        historyCount: 5,
        history: [
          {
            id: 1,
            reportId: 1,
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 95,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "normal",
            category: "Sugar",
            reportDate: "2023-01-01",
            fileName: "R1.pdf",
          },
          {
            id: 2,
            reportId: 2,
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 180,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "high",
            category: "Sugar",
            reportDate: "2023-06-01",
            fileName: "R2.pdf",
          },
          {
            id: 3,
            reportId: 3,
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 165,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "high",
            category: "Sugar",
            reportDate: "2024-01-01",
            fileName: "R3.pdf",
          },
          {
            id: 4,
            reportId: 4,
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 150,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "high",
            category: "Sugar",
            reportDate: "2024-08-01",
            fileName: "R4.pdf",
          },
          {
            id: 5,
            reportId: 5,
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 115,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "high",
            category: "Sugar",
            reportDate: "2024-11-01",
            fileName: "R5.pdf",
          },
        ],
      };

      const res = classifyBiomarkerStatus(fiveReportsSummary);
      expect(res.needsAttention).toBe(true);
      expect(res.isAttentionImproved).toBe(true);
      expect(res.isAttentionWorsen).toBe(false);
      expect(res.isBorderRange).toBe(false);
    });
  });
});
