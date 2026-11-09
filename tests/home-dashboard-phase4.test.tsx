import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RangeBar } from "@/components/ui/RangeBar";
import { Sparkline } from "@/components/ui/Sparkline";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricDetailModal } from "@/components/MetricDetailModal";
import { LatestResultSummary, ResultWithDate } from "@/lib/db/schema";

describe("Phase 4: Home Dashboard Components", () => {
  describe("RangeBar Component", () => {
    it("renders bounds and normal label for two-number intervals", () => {
      render(
        <RangeBar
          value={85}
          refLow={70}
          refHigh={99}
          flag="normal"
          unit="mg/dL"
          showLabels
        />
      );
      expect(screen.getByText("70")).toBeDefined();
      expect(screen.getByText("99")).toBeDefined();
      expect(screen.getByText(/normal/i)).toBeDefined();
    });

    it("renders upper bound only when refLow is undefined", () => {
      render(
        <RangeBar
          value={180}
          refHigh={200}
          flag="normal"
          unit="mg/dL"
          showLabels
        />
      );
      expect(screen.getByText("200")).toBeDefined();
    });

    it("renders fallback when no reference bounds exist", () => {
      render(
        <RangeBar
          value={42}
          flag="normal"
          unit=""
          showLabels
        />
      );
      expect(screen.getByText("No reference range")).toBeDefined();
    });
  });

  describe("Sparkline Component", () => {
    it("renders dot for single data point", () => {
      const { container } = render(
        <Sparkline values={[100]} flag="normal" width={64} height={20} />
      );
      expect(container.querySelector("circle")).toBeDefined();
    });

    it("renders path for multi-point history", () => {
      const { container } = render(
        <Sparkline values={[90, 95, 104]} flag="borderline" width={64} height={20} />
      );
      expect(container.querySelector("path.stroke-amber-500")).toBeDefined();
    });
  });

  describe("BiomarkerCard Component", () => {
    const mockSummary: LatestResultSummary = {
      metricKey: "glucose_fasting",
      displayName: "Fasting Blood Glucose",
      category: "Sugar",
      standardUnit: "mg/dL",
      latestResult: {
        id: 1,
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
        fileName: "LalPathlabs_2024.pdf",
      },
      previousResult: {
        id: 2,
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
        fileName: "LalPathlabs_2023.pdf",
      },
      changeValue: 12,
      changePercent: 13,
      historyCount: 2,
      sparklineValues: [92, 104],
    };

    it("renders metric name, big value, unit, status badge, and change arrow", () => {
      const handleClick = vi.fn();
      render(<BiomarkerCard summary={mockSummary} onClick={handleClick} />);

      expect(screen.getByText("Fasting Blood Glucose")).toBeDefined();
      expect(screen.getByText("104")).toBeDefined();
      expect(screen.getByText("mg/dL")).toBeDefined();
      expect(screen.getByText("Borderline")).toBeDefined();
      expect(screen.getByText("up 12")).toBeDefined();
      expect(screen.getByText("vs prev")).toBeDefined();
    });

    it("triggers onClick when card is clicked or keyboard activated", () => {
      const handleClick = vi.fn();
      render(<BiomarkerCard summary={mockSummary} onClick={handleClick} />);

      const card = screen.getByRole("button", { name: /fasting blood glucose/i });
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(card, { key: "Enter" });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it("displays 'down' for decreased values and 'no change' for identical values", () => {
      const decreasedSummary: LatestResultSummary = {
        ...mockSummary,
        latestResult: { ...mockSummary.latestResult, value: 85, flag: "normal" },
        changeValue: -7,
      };

      const { rerender } = render(
        <BiomarkerCard summary={decreasedSummary} onClick={() => {}} />
      );
      expect(screen.getByText("down 7")).toBeDefined();

      const unchangedSummary: LatestResultSummary = {
        ...mockSummary,
        changeValue: 0,
      };
      rerender(<BiomarkerCard summary={unchangedSummary} onClick={() => {}} />);
      expect(screen.getByText("no change")).toBeDefined();
    });

    it("displays 'First record' when no previous report exists", () => {
      const singleSummary: LatestResultSummary = {
        ...mockSummary,
        previousResult: undefined,
        changeValue: undefined,
      };
      render(<BiomarkerCard summary={singleSummary} onClick={() => {}} />);
      expect(screen.getByText("First record")).toBeDefined();
    });
  });

  describe("Calm Illustration-Free Empty State", () => {
    it("renders 'No reports yet' with Upload button and 'Try demo data' link", () => {
      const handleUpload = vi.fn();
      const handleDemo = vi.fn();

      render(
        <EmptyState
          title="No reports yet"
          description="Upload your test report PDF to see your health dashboard."
          actionLabel="Upload report"
          onAction={handleUpload}
          secondaryActionLabel="Try demo data"
          secondaryActionType="link"
          onSecondaryAction={handleDemo}
        />
      );

      expect(screen.getByText("No reports yet")).toBeDefined();
      expect(screen.getByRole("button", { name: /upload report/i })).toBeDefined();

      const demoLink = screen.getByText("Try demo data");
      expect(demoLink).toBeDefined();
      fireEvent.click(demoLink);
      expect(handleDemo).toHaveBeenCalledTimes(1);
    });
  });

  describe("Metric Detail Modal", () => {
    const mockSummary: LatestResultSummary = {
      metricKey: "glucose_fasting",
      displayName: "Fasting Blood Glucose",
      category: "Sugar",
      standardUnit: "mg/dL",
      latestResult: {
        id: 1,
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
        fileName: "Quest_2024.pdf",
      },
      previousResult: {
        id: 2,
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
        fileName: "Quest_2023.pdf",
      },
      changeValue: 12,
      changePercent: 13,
      historyCount: 2,
    };

    const mockHistory: ResultWithDate[] = [
      mockSummary.previousResult!,
      mockSummary.latestResult,
    ];

    it("renders modal header, values, and historical readings", () => {
      const handleClose = vi.fn();
      render(
        <MetricDetailModal
          summary={mockSummary}
          history={mockHistory}
          isOpen={true}
          onClose={handleClose}
        />
      );

      expect(screen.getAllByText("Fasting Blood Glucose").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("104").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Switch to mmol/L")).toBeDefined();

      // Click done
      const doneBtn = screen.getByRole("button", { name: /done/i });
      fireEvent.click(doneBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("toggles unit conversion between mg/dL and mmol/L", () => {
      render(
        <MetricDetailModal
          summary={mockSummary}
          history={mockHistory}
          isOpen={true}
          onClose={() => {}}
        />
      );

      const toggleBtn = screen.getByRole("button", { name: /switch to mmol\/l/i });
      fireEvent.click(toggleBtn);

      // 104 mg/dL / 18.0182 = 5.77 mmol/L
      expect(screen.getAllByText("5.77").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /switch to mg\/dl/i })).toBeDefined();
    });
  });
});
