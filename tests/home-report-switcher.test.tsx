import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Report, ResultWithDate, LatestResultSummary } from "@/lib/db/schema";
import { buildReportScopedSummaries } from "@/lib/utils/reportView";
import { HomeDashboardView, HomeFilterType } from "@/components/HomeDashboardView";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { MetricDetailModal } from "@/components/MetricDetailModal";
import { Navbar } from "@/components/Navbar";

const repLatest: Report = {
  id: 3,
  fileName: "Quest_Jan2025.pdf",
  labName: "Quest Diagnostics",
  reportDate: "2025-01-20",
  uploadedAt: 3000,
  status: "active",
  parseWarnings: [],
};

const repMid: Report = {
  id: 2,
  fileName: "Labcorp_Oct2024.pdf",
  labName: "Labcorp",
  reportDate: "2024-10-10",
  uploadedAt: 2000,
  status: "active",
  parseWarnings: [],
};

const repOld: Report = {
  id: 1,
  fileName: "Quest_Apr2024.pdf",
  labName: "Quest Diagnostics",
  reportDate: "2024-04-15",
  uploadedAt: 1000,
  status: "active",
  parseWarnings: [],
};

const rGlucoseOld: ResultWithDate = {
  id: 1,
  reportId: 1,
  metricKey: "glucose_fasting",
  displayName: "Fasting Blood Glucose",
  value: 108,
  unit: "mg/dL",
  refLow: 70,
  refHigh: 99,
  flag: "high",
  category: "Sugar",
  reportDate: "2024-04-15",
  fileName: "Quest_Apr2024.pdf",
};

const rGlucoseMid: ResultWithDate = {
  id: 2,
  reportId: 2,
  metricKey: "glucose_fasting",
  displayName: "Fasting Blood Glucose",
  value: 96,
  unit: "mg/dL",
  refLow: 70,
  refHigh: 99,
  flag: "normal",
  category: "Sugar",
  reportDate: "2024-10-10",
  fileName: "Labcorp_Oct2024.pdf",
};

const rGlucoseLatest: ResultWithDate = {
  id: 3,
  reportId: 3,
  metricKey: "glucose_fasting",
  displayName: "Fasting Blood Glucose",
  value: 91,
  unit: "mg/dL",
  refLow: 70,
  refHigh: 99,
  flag: "normal",
  category: "Sugar",
  reportDate: "2025-01-20",
  fileName: "Quest_Jan2025.pdf",
};

// Vitamin D is in Latest & Old, skipped in Mid (tests fallback to 3rd latest!)
const rVitDOld: ResultWithDate = {
  id: 4,
  reportId: 1,
  metricKey: "vitamin_d",
  displayName: "Vitamin D (25-OH)",
  value: 22,
  unit: "ng/mL",
  refLow: 30,
  refHigh: 100,
  flag: "borderline",
  category: "Vitamins",
  reportDate: "2024-04-15",
  fileName: "Quest_Apr2024.pdf",
};

const rVitDLatest: ResultWithDate = {
  id: 5,
  reportId: 3,
  metricKey: "vitamin_d",
  displayName: "Vitamin D (25-OH)",
  value: 44,
  unit: "ng/mL",
  refLow: 30,
  refHigh: 100,
  flag: "normal",
  category: "Vitamins",
  reportDate: "2025-01-20",
  fileName: "Quest_Jan2025.pdf",
};

// Calcium is ONLY in Latest (no other report has it -> no trend!)
const rCalciumLatest: ResultWithDate = {
  id: 6,
  reportId: 3,
  metricKey: "calcium",
  displayName: "Serum Calcium",
  value: 9.5,
  unit: "mg/dL",
  refLow: 8.5,
  refHigh: 10.5,
  flag: "normal",
  category: "Other",
  reportDate: "2025-01-20",
  fileName: "Quest_Jan2025.pdf",
};

// Hemoglobin is ONLY in Old (should NOT appear when viewing Latest!)
const rHgbOld: ResultWithDate = {
  id: 7,
  reportId: 1,
  metricKey: "hemoglobin",
  displayName: "Hemoglobin",
  value: 11.8,
  unit: "g/dL",
  refLow: 13.5,
  refHigh: 17.5,
  flag: "low",
  category: "Blood",
  reportDate: "2024-04-15",
  fileName: "Quest_Apr2024.pdf",
};

const activeReports = [repLatest, repMid, repOld];

const resultsByReportId: Record<number, ResultWithDate[]> = {
  3: [rGlucoseLatest, rVitDLatest, rCalciumLatest],
  2: [rGlucoseMid],
  1: [rGlucoseOld, rVitDOld, rHgbOld],
};

const allHistoryByMetric: Record<string, ResultWithDate[]> = {
  glucose_fasting: [rGlucoseOld, rGlucoseMid, rGlucoseLatest],
  vitamin_d: [rVitDOld, rVitDLatest],
  calcium: [rCalciumLatest],
  hemoglobin: [rHgbOld],
};

describe("Homepage Report-Scoped View & Comparison Rules", () => {
  it("scopes cards to Latest report only and compares against 2nd latest (falling back to older if missing)", () => {
    const summaries = buildReportScopedSummaries(
      repLatest,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );

    const keys = summaries.map((s) => s.metricKey);
    // Hemoglobin was only in repOld, must NOT appear on Latest report view
    expect(keys).toContain("glucose_fasting");
    expect(keys).toContain("vitamin_d");
    expect(keys).toContain("calcium");
    expect(keys).not.toContain("hemoglobin");

    // Glucose compares Latest (91) vs Mid (96) -> -5 since Oct 2024
    const glucose = summaries.find((s) => s.metricKey === "glucose_fasting")!;
    expect(glucose.changeValue).toBe(-5);
    expect(glucose.previousResult?.reportDate).toBe("2024-10-10");
    expect(glucose.comparisonRelation).toBe("since");

    // Vitamin D is missing in Mid, falls back to Old (22) -> +22 since Apr 2024
    const vitD = summaries.find((s) => s.metricKey === "vitamin_d")!;
    expect(vitD.changeValue).toBe(22);
    expect(vitD.previousResult?.reportDate).toBe("2024-04-15");
    expect(vitD.comparisonRelation).toBe("since");

    // Calcium is only in Latest -> no comparison, historyCount === 1
    const calcium = summaries.find((s) => s.metricKey === "calcium")!;
    expect(calcium.previousResult).toBeUndefined();
    expect(calcium.changeValue).toBeUndefined();
    expect(calcium.historyCount).toBe(1);
  });

  it("scopes cards to Previous report and compares against Latest report with 'vs' relation", () => {
    const summaries = buildReportScopedSummaries(
      repOld,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );

    const keys = summaries.map((s) => s.metricKey);
    expect(keys).toContain("glucose_fasting");
    expect(keys).toContain("vitamin_d");
    expect(keys).toContain("hemoglobin");
    expect(keys).not.toContain("calcium");

    // Glucose on Old (108) compares against Latest (91) -> +17 vs Jan 2025
    const glucose = summaries.find((s) => s.metricKey === "glucose_fasting")!;
    expect(glucose.changeValue).toBe(17);
    expect(glucose.previousResult?.reportDate).toBe("2025-01-20");
    expect(glucose.comparisonRelation).toBe("vs");

    // Hemoglobin is only in Old -> no other report has it
    const hgb = summaries.find((s) => s.metricKey === "hemoglobin")!;
    expect(hgb.previousResult).toBeUndefined();
    expect(hgb.historyCount).toBe(1);
  });

  it("hides trend sparkline on BiomarkerCard when hideSinglePointTrend is true and only 1 record exists", () => {
    const summaries = buildReportScopedSummaries(
      repLatest,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );
    const calcium = summaries.find((s) => s.metricKey === "calcium")!;
    const glucose = summaries.find((s) => s.metricKey === "glucose_fasting")!;

    const { container: singleContainer } = render(
      <BiomarkerCard summary={calcium} hideSinglePointTrend onClick={() => {}} />
    );
    expect(singleContainer.querySelector("svg")).toBeNull();
    expect(screen.getByText("First record")).toBeDefined();

    const { container: multiContainer } = render(
      <BiomarkerCard summary={glucose} hideSinglePointTrend onClick={() => {}} />
    );
    expect(multiContainer.querySelector("svg")).not.toBeNull();
    expect(screen.getByText(/since\s+10 Oct 2024/i)).toBeDefined();
  });

  it("renders dynamic 'vs' subtext when viewing a previous report compared against latest", () => {
    const summaries = buildReportScopedSummaries(
      repOld,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );
    const glucose = summaries.find((s) => s.metricKey === "glucose_fasting")!;

    render(<BiomarkerCard summary={glucose} hideSinglePointTrend onClick={() => {}} />);
    expect(screen.getByText(/up\s+17/i)).toBeDefined();
    expect(screen.getByText(/vs\s+20 Jan 2025/i)).toBeDefined();
  });

  it("HomeDashboardView renders category accordions and supports All / Out of range / Within range filters", () => {
    const summaries = buildReportScopedSummaries(
      repOld,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );

    const Harness = () => {
      const [filters, setFilters] = React.useState<Set<HomeFilterType>>(new Set(["all"]));
      const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

      const toggleFilter = (f: HomeFilterType) => {
        setFilters((prev) => {
          if (f === "all") return new Set(["all"]);
          const next = new Set(prev);
          next.delete("all");
          if (next.has(f)) next.delete(f);
          else next.add(f);
          if (next.size === 0 || next.size === 2) return new Set(["all"]);
          return next;
        });
      };

      const togglePanel = (p: string) => {
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(p)) next.delete(p);
          else next.add(p);
          return next;
        });
      };

      return (
        <HomeDashboardView
          summaries={summaries}
          selectedFilters={filters}
          onToggleFilter={toggleFilter}
          collapsedPanels={collapsed}
          onTogglePanel={togglePanel}
          onOpenDetail={() => {}}
        />
      );
    };

    render(<Harness />);

    // Panel headers matching SingleMetricTrendsView naming
    expect(screen.getByText("Metabolic Panel")).toBeDefined();
    expect(screen.getByText("Vitamins & Minerals")).toBeDefined();
    expect(screen.getByText("Complete Blood Count")).toBeDefined();

    // Filter checkboxes exist
    expect(screen.getByLabelText(/Out of range/i)).toBeDefined();
    expect(screen.getByLabelText(/Within range/i)).toBeDefined();

    // Clicking "Within range" when all 3 markers in repOld are abnormal/borderline shows empty filter message
    fireEvent.click(screen.getByLabelText(/Within range/i));
    expect(screen.getByText(/No markers match this filter/i)).toBeDefined();

    // Clicking "Show all markers" resets back to All
    fireEvent.click(screen.getByText("Show all markers"));
    expect(screen.getByText("Metabolic Panel")).toBeDefined();

    // Collapsing Metabolic Panel hides Fasting Glucose card
    expect(screen.getByText("Fasting Glucose")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Metabolic Panel/i }));
    expect(screen.queryByText("Fasting Glucose")).toBeNull();
  });

  it("MetricDetailModal updates top section dynamically for custom report date while keeping full historical trend below", () => {
    const summaries = buildReportScopedSummaries(
      repOld,
      activeReports,
      resultsByReportId,
      allHistoryByMetric
    );
    const glucoseOldSummary: LatestResultSummary = summaries.find(
      (s) => s.metricKey === "glucose_fasting"
    )!;

    render(
      <MetricDetailModal
        summary={glucoseOldSummary}
        history={allHistoryByMetric["glucose_fasting"]}
        isLatestReport={false}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Top section shows Apr 2024 value (108), custom date subtitle, and comparison vs Latest
    expect(screen.getAllByText("108").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/15 Apr 2024 report/i)).toBeDefined();
    expect(screen.getByText(/\+17 vs 20 Jan 2025/i)).toBeDefined();

    // Bottom section shows full 3-record longitudinal history
    expect(screen.getByText(/Historical trend \(3 records\)/i)).toBeDefined();
  });

  it("Navbar renders theme switcher (Light / Auto / Dark) above Log in / Sign up button at bottom", () => {
    const onOpenAuth = vi.fn();
    const { container } = render(
      <Navbar
        activeTab="home"
        onSelectTab={() => {}}
        onOpenUpload={() => {}}
        onOpenAuth={onOpenAuth}
        markersCount={12}
        reportsCount={3}
      />
    );

    const sidebar = container.querySelector("aside");
    expect(sidebar).not.toBeNull();
    expect(screen.getByRole("radio", { name: "Light" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Auto" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeDefined();

    const authBtn = screen.getByRole("button", { name: /Log in \/ Sign up/i });
    expect(authBtn).toBeDefined();
    fireEvent.click(authBtn);
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });
});
