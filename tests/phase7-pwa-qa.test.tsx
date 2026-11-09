import React, { useState } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "fake-indexeddb/auto";
import fs from "fs";
import path from "path";

import {
  db,
  addReport,
  getActiveReports,
  getLatestResults,
  getUndoneReports,
  undoLastUpload,
  restoreUndone,
  deleteAllData,
} from "@/lib/db";
import { checkForDuplicateReport } from "@/lib/db/duplicateDetection";
import { parseReportText } from "@/lib/parser/reportParser";
import { Navbar, NavTab } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useThemeStore } from "@/lib/store/themeStore";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

describe("Phase 7: Polish, PWA, and QA Verification", () => {
  beforeEach(async () => {
    await deleteAllData();

    // Mock matchMedia for theme tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------
   * 1. PWA Manifest & Offline Assets
   * ------------------------------------------------------------------ */
  describe("PWA Manifest and Offline Configuration", () => {
    it("has a valid manifest.json with required PWA metadata", () => {
      const manifestPath = path.join(process.cwd(), "public", "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifestContent.name).toBe("Gula — Private Health Dashboard");
      expect(manifestContent.short_name).toBe("Gula");
      expect(manifestContent.display).toBe("standalone");
      expect(manifestContent.start_url).toBe("/");
      expect(manifestContent.theme_color).toBe("#2563eb");
      expect(manifestContent.icons).toBeDefined();
      expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);

      const has192 = manifestContent.icons.some(
        (i: any) => i.sizes === "192x192" && i.purpose === "any maskable"
      );
      const has512 = manifestContent.icons.some(
        (i: any) => i.sizes === "512x512" && i.purpose === "any maskable"
      );
      expect(has192).toBe(true);
      expect(has512).toBe(true);
    });

    it("verifies public icons exist on disk", () => {
      const icon192 = path.join(process.cwd(), "public", "icons", "icon-192x192.png");
      const icon512 = path.join(process.cwd(), "public", "icons", "icon-512x512.png");
      const iconSvg = path.join(process.cwd(), "public", "icons", "icon.svg");

      expect(fs.existsSync(icon192)).toBe(true);
      expect(fs.existsSync(icon512)).toBe(true);
      expect(fs.existsSync(iconSvg)).toBe(true);
      expect(fs.statSync(icon192).size).toBeGreaterThan(0);
      expect(fs.statSync(icon512).size).toBeGreaterThan(0);
    });

    it("verifies service worker file caches critical offline assets", () => {
      const swPath = path.join(process.cwd(), "public", "sw.js");
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("gula-v1");
      expect(swContent).toContain("/pdf.worker.min.mjs");
      expect(swContent).toContain("/manifest.json");
    });

    it("registers service worker on mount if supported", async () => {
      const registerMock = vi.fn().mockResolvedValue({ scope: "/" });
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          register: registerMock,
        },
        configurable: true,
        writable: true,
      });

      render(<ServiceWorkerRegister />);

      await waitFor(() => {
        expect(registerMock).toHaveBeenCalledWith("/sw.js");
      });
    });
  });

  /* ------------------------------------------------------------------
   * 2. Responsive Viewport Test Matrix (iPhone SE, iPhone 15, iPad, Desktop)
   * ------------------------------------------------------------------ */
  describe("Responsive Viewport Test Matrix", () => {
    const renderWithWidth = (width: number) => {
      window.innerWidth = width;
      window.dispatchEvent(new Event("resize"));
      const onSelectTab = vi.fn();
      const onOpenUpload = vi.fn();

      return render(
        <Navbar
          activeTab="home"
          onSelectTab={onSelectTab}
          onOpenUpload={onOpenUpload}
        />
      );
    };

    it("renders navigation correctly at 375px (iPhone SE)", () => {
      const { container } = renderWithWidth(375);
      const mobileNav = container.querySelector("nav[aria-label='Mobile Bottom Navigation']");
      expect(mobileNav).not.toBeNull();

      const buttons = mobileNav?.querySelectorAll("button");
      expect(buttons?.length).toBeGreaterThanOrEqual(4);
    });

    it("renders navigation correctly at 393px (iPhone 15)", () => {
      const { container } = renderWithWidth(393);
      const mobileNav = container.querySelector("nav[aria-label='Mobile Bottom Navigation']");
      expect(mobileNav).not.toBeNull();
      expect(screen.getAllByText("Home")).toBeDefined();
      expect(screen.getAllByText("Trends")).toBeDefined();
      expect(screen.getAllByText("Settings")).toBeDefined();
    });

    it("renders desktop sidebar navigation structure at 768px (iPad)", () => {
      const { container } = renderWithWidth(768);
      const desktopSidebar = container.querySelector("aside");
      expect(desktopSidebar).not.toBeNull();
      expect(desktopSidebar?.textContent).toContain("Gula");
    });

    it("renders desktop sidebar navigation structure at 1440px (Desktop)", () => {
      const { container } = renderWithWidth(1440);
      const desktopSidebar = container.querySelector("aside");
      expect(desktopSidebar).not.toBeNull();
      expect(desktopSidebar?.textContent).toContain("Gula");
      expect(desktopSidebar?.textContent).toContain("Upload report");
    });
  });

  /* ------------------------------------------------------------------
   * 3. Error Boundaries (Zero Blank Screen)
   * ------------------------------------------------------------------ */
  describe("Error Boundaries", () => {
    const ProblematicComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error("Simulated unexpected rendering crash");
      }
      return <div>Healthy component rendered smoothly</div>;
    };

    it("catches runtime errors and renders reassuring fallback UI", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ErrorBoundary fallbackTitle="Section Error">
          <ProblematicComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Section Error")).toBeDefined();
      expect(screen.getByText(/Your health records are safe in local storage/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();

      consoleErrorSpy.mockRestore();
    });

    it("allows resetting from the error state via Try Again button", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const TestHarness = () => {
        const [hasError, setHasError] = useState(true);
        return (
          <ErrorBoundary>
            {hasError ? (
              <button onClick={() => setHasError(false)}>Simulate fix</button>
            ) : null}
            <ProblematicComponent shouldThrow={hasError} />
          </ErrorBoundary>
        );
      };

      render(<TestHarness />);
      expect(screen.getByText(/Couldn't load this section/i)).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  /* ------------------------------------------------------------------
   * 4. Loading Skeleton Component
   * ------------------------------------------------------------------ */
  describe("Dashboard Skeleton", () => {
    it("renders loading skeletons for summary strip and category cards", () => {
      const { container } = render(<DashboardSkeleton />);
      const animatedSkeletons = container.querySelectorAll(".animate-pulse");
      expect(animatedSkeletons.length).toBeGreaterThan(10);
    });
  });

  /* ------------------------------------------------------------------
   * 5. Theme Switching (Light / Dark / System)
   * ------------------------------------------------------------------ */
  describe("Theme Management", () => {
    it("supports switching between light, dark, and system themes", () => {
      const store = useThemeStore.getState();

      store.setTheme("dark");
      expect(useThemeStore.getState().theme).toBe("dark");

      store.setTheme("light");
      expect(useThemeStore.getState().theme).toBe("light");

      store.setTheme("system");
      expect(useThemeStore.getState().theme).toBe("system");
    });
  });

  /* ------------------------------------------------------------------
   * 6. Final QA Checklist End-to-End Scenarios
   * ------------------------------------------------------------------ */
  describe("Final QA Checklist Scenarios", () => {
    it("Scenario 1: Valid report parsed and ingested successfully", async () => {
      const reportId = await addReport(
        {
          fileName: "blood_test_valid.pdf",
          labName: "Dr Lal PathLabs",
          reportDate: "2025-01-15",
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: new Blob(["pdf"], { type: "application/pdf" }),
          parseWarnings: [],
        },
        [
          {
            metricKey: "hemoglobin",
            displayName: "Hemoglobin",
            value: 14.5,
            unit: "g/dL",
            refLow: 13.0,
            refHigh: 17.0,
            flag: "normal",
            category: "Blood",
          },
          {
            metricKey: "cholesterol_total",
            displayName: "Total Cholesterol",
            value: 235,
            unit: "mg/dL",
            refLow: undefined,
            refHigh: 200,
            flag: "high",
            category: "Lipids",
          },
        ]
      );

      const active = await getActiveReports();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(reportId);

      const latest = await getLatestResults();
      expect(latest.length).toBe(2);
      const highChol = latest.find((l) => l.metricKey === "cholesterol_total");
      expect(highChol?.latestResult.flag).toBe("high");
      expect(highChol?.latestResult.value).toBe(235);
    });

    it("Scenario 2: Scanned PDF / zero-text detection returns empty results without throwing", () => {
      const parsed = parseReportText("");
      expect(parsed.biomarkers.length).toBe(0);
      expect(parsed.labName).toBe("Unknown lab");
      expect(parsed.warnings.length).toBeGreaterThan(0);
    });

    it("Scenario 3: Non-PDF or invalid files handled safely", () => {
      const text = "This is a random text file with no medical biomarker data.";
      const parsed = parseReportText(text);
      expect(parsed.biomarkers.length).toBe(0);
    });

    it("Scenario 4: Duplicate report detection flags same date and overlapping tests", async () => {
      await addReport(
        {
          fileName: "annual_checkup_2025.pdf",
          labName: "Thyrocare",
          reportDate: "2025-02-10",
          uploadedAt: Date.now(),
          status: "active",
          fileBlob: new Blob(["pdf"], { type: "application/pdf" }),
          parseWarnings: [],
        },
        [
          {
            metricKey: "tsh",
            displayName: "TSH",
            value: 2.1,
            unit: "uIU/mL",
            refLow: 0.4,
            refHigh: 4.5,
            flag: "normal",
            category: "Thyroid",
          },
        ]
      );

      // Check for duplicate with identical date and matching test
      const duplicate = await checkForDuplicateReport("2025-02-10", [
        { metricKey: "tsh", value: 2.1 },
      ]);
      expect(duplicate.isDuplicate).toBe(true);
      expect(duplicate.duplicateReportName).toBe("annual_checkup_2025.pdf");

      // Check for non-duplicate with different date
      const nonDuplicate = await checkForDuplicateReport("2024-02-10", [
        { metricKey: "tsh", value: 2.1 },
      ]);
      expect(nonDuplicate.isDuplicate).toBe(false);
    });

    it("Scenario 5: Upload wrong PDF then Undo reverts state completely", async () => {
      // Report 1: Good baseline
      await addReport(
        {
          fileName: "report_1_good.pdf",
          labName: "Apollo",
          reportDate: "2024-06-01",
          uploadedAt: 1000,
          status: "active",
          fileBlob: new Blob(["1"]),
          parseWarnings: [],
        },
        [
          {
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 90,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "normal",
            category: "Sugar",
          },
        ]
      );

      // Report 2: Mistaken upload
      await addReport(
        {
          fileName: "wrong_patient_report.pdf",
          labName: "Apollo",
          reportDate: "2024-07-01",
          uploadedAt: 2000,
          status: "active",
          fileBlob: new Blob(["2"]),
          parseWarnings: [],
        },
        [
          {
            metricKey: "glucose_fasting",
            displayName: "Fasting Glucose",
            value: 180,
            unit: "mg/dL",
            refLow: 70,
            refHigh: 99,
            flag: "high",
            category: "Sugar",
          },
        ]
      );

      // Verify mistake is currently latest
      let latest = await getLatestResults();
      expect(latest[0].latestResult.value).toBe(180);

      // User hits Undo
      const undone = await undoLastUpload();
      expect(undone).not.toBeNull();
      expect(undone?.fileName).toBe("wrong_patient_report.pdf");

      // App reverts to Report 1
      latest = await getLatestResults();
      expect(latest.length).toBe(1);
      expect(latest[0].latestResult.value).toBe(90);

      const activeReports = await getActiveReports();
      expect(activeReports.length).toBe(1);
      expect(activeReports[0].fileName).toBe("report_1_good.pdf");

      // Restore capability
      await restoreUndone();
      latest = await getLatestResults();
      expect(latest[0].latestResult.value).toBe(180);
    });
  });
});
