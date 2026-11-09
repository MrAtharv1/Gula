import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  calculateTrendInsight,
  calculateHistoricalMinMax,
} from "@/lib/utils/trends";
import { BiomarkerTrendChart } from "@/components/BiomarkerTrendChart";
import { MultiMetricTrendChart } from "@/components/MultiMetricTrendChart";
import { ResultWithDate, LatestResultSummary } from "@/lib/db/schema";

describe("Phase 5: Trends and Metric Detail", () => {
  describe("Mathematical Trend Insight (Zero AI)", () => {
    it("returns null when fewer than 3 values are provided", () => {
      expect(calculateTrendInsight([])).toBeNull();
      expect(calculateTrendInsight([85])).toBeNull();
      expect(calculateTrendInsight([85, 90])).toBeNull();
    });

    it("detects rising sequence across 3 or more reports", () => {
      // Rising across 3 reports
      const r1 = calculateTrendInsight([78, 85, 92]);
      expect(r1).not.toBeNull();
      expect(r1?.direction).toBe("rising");
      expect(r1?.count).toBe(3);
      expect(r1?.message).toBe("Rising across the last 3 reports.");

      // Rising across 4 reports even when starting from earlier values
      const r2 = calculateTrendInsight([100, 75, 80, 88, 96]);
      expect(r2).not.toBeNull();
      expect(r2?.direction).toBe("rising");
      expect(r2?.count).toBe(4);
      expect(r2?.message).toBe("Rising across the last 4 reports.");
    });

    it("detects falling sequence across 3 or more reports", () => {
      const r1 = calculateTrendInsight([140, 125, 110]);
      expect(r1).not.toBeNull();
      expect(r1?.direction).toBe("falling");
      expect(r1?.count).toBe(3);
      expect(r1?.message).toBe("Falling across the last 3 reports.");

      // 4 falling points
      const r2 = calculateTrendInsight([80, 150, 135, 120, 105]);
      expect(r2).not.toBeNull();
      expect(r2?.direction).toBe("falling");
      expect(r2?.count).toBe(4);
      expect(r2?.message).toBe("Falling across the last 4 reports.");
    });

    it("returns null when values fluctuate", () => {
      expect(calculateTrendInsight([80, 95, 88])).toBeNull();
      expect(calculateTrendInsight([100, 110, 105, 112])).toBeNull();
    });

    it("detects trends even when values remain inside normal range", () => {
      // Normal fasting glucose is 70-99; these are all normal but rising
      const normalRising = [72, 80, 89, 95];
      const insight = calculateTrendInsight(normalRising);
      expect(insight?.direction).toBe("rising");
      expect(insight?.message).toBe("Rising across the last 4 reports.");
    });
  });

  describe("Historical Min / Max Calculation", () => {
    it("computes min and max correctly", () => {
      expect(calculateHistoricalMinMax([92, 104, 88, 115])).toEqual({
        min: 88,
        max: 115,
      });
      expect(calculateHistoricalMinMax([50])).toEqual({ min: 50, max: 50 });
      expect(calculateHistoricalMinMax([])).toBeNull();
    });
  });

  describe("BiomarkerTrendChart Graceful Rendering", () => {
    it("gracefully handles a single data point with clear notice", () => {
      const singlePoint: ResultWithDate[] = [
        {
          id: 1,
          reportId: 1,
          metricKey: "hemoglobin",
          displayName: "Hemoglobin",
          value: 14.5,
          unit: "g/dL",
          refLow: 13.5,
          refHigh: 17.5,
          flag: "normal",
          category: "Blood",
          reportDate: "2024-04-15",
          fileName: "Report_2024.pdf",
        },
      ];

      render(
        <BiomarkerTrendChart
          history={singlePoint}
          biomarkerName="Hemoglobin"
          unit="g/dL"
          refLow={13.5}
          refHigh={17.5}
          description="Oxygen-carrying protein in red blood cells."
        />
      );

      expect(screen.getByText("Hemoglobin")).toBeDefined();
      expect(screen.getByText("14.5")).toBeDefined();
      expect(
        screen.getByText("1 report recorded. Add more reports to see trend lines.")
      ).toBeDefined();
      expect(screen.getByText("Initial test")).toBeDefined();
      expect(
        screen.getByText("Oxygen-carrying protein in red blood cells.")
      ).toBeDefined();
    });

    it("gracefully handles two data points with trend change", () => {
      const twoPoints: ResultWithDate[] = [
        {
          id: 1,
          reportId: 1,
          metricKey: "glucose_fasting",
          displayName: "Fasting Glucose",
          value: 92,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "normal",
          category: "Sugar",
          reportDate: "2023-10-10",
          fileName: "Report_2023.pdf",
        },
        {
          id: 2,
          reportId: 2,
          metricKey: "glucose_fasting",
          displayName: "Fasting Glucose",
          value: 104,
          unit: "mg/dL",
          refLow: 70,
          refHigh: 99,
          flag: "borderline",
          category: "Sugar",
          reportDate: "2024-04-15",
          fileName: "Report_2024.pdf",
        },
      ];

      render(
        <BiomarkerTrendChart
          history={twoPoints}
          biomarkerName="Fasting Glucose"
          unit="mg/dL"
          refLow={70}
          refHigh={99}
          description="Blood sugar level following an overnight fast."
        />
      );

      expect(screen.getByText("104")).toBeDefined();
      expect(screen.getByText("+12 mg/dL")).toBeDefined();
      expect(screen.getByText("92 — 104 mg/dL")).toBeDefined();
    });

    it("renders trend insight banner for 3 or more rising points", () => {
      const risingHistory: ResultWithDate[] = [
        {
          id: 1,
          reportId: 1,
          metricKey: "tsh",
          displayName: "TSH",
          value: 1.8,
          unit: "uIU/mL",
          refLow: 0.4,
          refHigh: 4.5,
          flag: "normal",
          category: "Thyroid",
          reportDate: "2023-01-10",
          fileName: "R1.pdf",
        },
        {
          id: 2,
          reportId: 2,
          metricKey: "tsh",
          displayName: "TSH",
          value: 2.4,
          unit: "uIU/mL",
          refLow: 0.4,
          refHigh: 4.5,
          flag: "normal",
          category: "Thyroid",
          reportDate: "2023-08-15",
          fileName: "R2.pdf",
        },
        {
          id: 3,
          reportId: 3,
          metricKey: "tsh",
          displayName: "TSH",
          value: 3.2,
          unit: "uIU/mL",
          refLow: 0.4,
          refHigh: 4.5,
          flag: "normal",
          category: "Thyroid",
          reportDate: "2024-03-20",
          fileName: "R3.pdf",
        },
      ];

      render(
        <BiomarkerTrendChart
          history={risingHistory}
          biomarkerName="Thyroid Stimulating Hormone (TSH)"
          unit="uIU/mL"
          refLow={0.4}
          refHigh={4.5}
        />
      );

      expect(screen.getByText("Rising across the last 3 reports.")).toBeDefined();
    });

    it("supports time filter buttons (3M, 6M, 1Y, All)", () => {
      const points: ResultWithDate[] = [
        {
          id: 1,
          reportId: 1,
          metricKey: "creatinine",
          displayName: "Creatinine",
          value: 1.0,
          unit: "mg/dL",
          refLow: 0.7,
          refHigh: 1.3,
          flag: "normal",
          category: "Kidney",
          reportDate: "2024-01-10",
          fileName: "R1.pdf",
        },
      ];

      render(
        <BiomarkerTrendChart
          history={points}
          biomarkerName="Creatinine"
          unit="mg/dL"
        />
      );

      expect(screen.getByText("3M")).toBeDefined();
      expect(screen.getByText("6M")).toBeDefined();
      expect(screen.getByText("1Y")).toBeDefined();
      expect(screen.getByText("All")).toBeDefined();

      // Click 3M filter
      fireEvent.click(screen.getByText("3M"));
    });
  });

  describe("MultiMetricTrendChart Overlay (Up to 4 Metrics)", () => {
    const mockSummaries: LatestResultSummary[] = [
      {
        metricKey: "cholesterol_total",
        displayName: "Total Cholesterol",
        category: "Lipids",
        standardUnit: "mg/dL",
        latestResult: {
          id: 1,
          reportId: 2,
          metricKey: "cholesterol_total",
          displayName: "Total Cholesterol",
          value: 210,
          unit: "mg/dL",
          refLow: 125,
          refHigh: 199,
          flag: "high",
          category: "Lipids",
          reportDate: "2024-04-15",
          fileName: "R2.pdf",
        },
        historyCount: 2,
      },
      {
        metricKey: "ldl",
        displayName: "LDL Cholesterol",
        category: "Lipids",
        standardUnit: "mg/dL",
        latestResult: {
          id: 2,
          reportId: 2,
          metricKey: "ldl",
          displayName: "LDL Cholesterol",
          value: 135,
          unit: "mg/dL",
          refLow: 50,
          refHigh: 99,
          flag: "high",
          category: "Lipids",
          reportDate: "2024-04-15",
          fileName: "R2.pdf",
        },
        historyCount: 2,
      },
      {
        metricKey: "hdl",
        displayName: "HDL Cholesterol",
        category: "Lipids",
        standardUnit: "mg/dL",
        latestResult: {
          id: 3,
          reportId: 2,
          metricKey: "hdl",
          displayName: "HDL Cholesterol",
          value: 48,
          unit: "mg/dL",
          refLow: 40,
          refHigh: 80,
          flag: "normal",
          category: "Lipids",
          reportDate: "2024-04-15",
          fileName: "R2.pdf",
        },
        historyCount: 2,
      },
      {
        metricKey: "triglycerides",
        displayName: "Triglycerides",
        category: "Lipids",
        standardUnit: "mg/dL",
        latestResult: {
          id: 4,
          reportId: 2,
          metricKey: "triglycerides",
          displayName: "Triglycerides",
          value: 160,
          unit: "mg/dL",
          refLow: 0,
          refHigh: 149,
          flag: "high",
          category: "Lipids",
          reportDate: "2024-04-15",
          fileName: "R2.pdf",
        },
        historyCount: 2,
      },
    ];

    const mockAllHistory: Record<string, ResultWithDate[]> = {
      cholesterol_total: [
        { ...mockSummaries[0].latestResult, value: 195, reportDate: "2023-10-10" },
        mockSummaries[0].latestResult,
      ],
      ldl: [
        { ...mockSummaries[1].latestResult, value: 120, reportDate: "2023-10-10" },
        mockSummaries[1].latestResult,
      ],
      hdl: [
        { ...mockSummaries[2].latestResult, value: 50, reportDate: "2023-10-10" },
        mockSummaries[2].latestResult,
      ],
      triglycerides: [
        { ...mockSummaries[3].latestResult, value: 140, reportDate: "2023-10-10" },
        mockSummaries[3].latestResult,
      ],
    };

    it("renders overlay chart with selected metric chips", () => {
      render(
        <MultiMetricTrendChart
          summaries={mockSummaries}
          allHistory={mockAllHistory}
          initialSelectedKeys={["cholesterol_total", "ldl", "hdl"]}
        />
      );

      expect(screen.getByText("Multi-Metric Overlay")).toBeDefined();
      expect(screen.getByText("(3/4 selected)")).toBeDefined();
      expect(screen.getByText("Total Cholesterol")).toBeDefined();
      expect(screen.getByText("LDL Cholesterol")).toBeDefined();
      expect(screen.getByText("HDL Cholesterol")).toBeDefined();
    });

    it("toggles normalized mode scale", () => {
      render(
        <MultiMetricTrendChart
          summaries={mockSummaries}
          allHistory={mockAllHistory}
          initialSelectedKeys={["cholesterol_total", "ldl"]}
        />
      );

      const toggle = screen.getByRole("button", { name: /standard units/i });
      expect(toggle).toBeDefined();
      fireEvent.click(toggle);

      expect(screen.getByText("Normalized (0–100%)")).toBeDefined();
    });
  });
});
