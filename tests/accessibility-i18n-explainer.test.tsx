import React from "react";
import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { getLaymanExplanation } from "@/lib/db/laymanExplainer";
import { MetricDetailModal } from "@/components/MetricDetailModal";
import { Navbar } from "@/components/Navbar";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { LatestResultSummary } from "@/lib/db/schema";
import { hasReachedGuestReportLimit, MAX_GUEST_REPORTS } from "@/lib/db";
import { APP_LANGUAGES } from "@/lib/i18n/translations";
import {
  getLocalizedMetricExplanation,
  getLocalizedMetricName,
  translateDynamicTestName,
} from "@/lib/i18n/metricTranslations";
import { AuthModal } from "@/components/AuthModal";
import { usePreferenceStore } from "@/lib/store/preferenceStore";

describe("Accessibility, SEO, Layman Explainer & Language Switcher", () => {
  it("allows pinch-zoom in layout viewport and includes SEO metadata & Gula explanation", () => {
    const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).not.toContain("maximumScale: 1");
    expect(content).not.toContain("maximum-scale=1");
    expect(content).toContain("GULA : Your Privacy Matters");
    expect(content).toContain("Gula: Blood Test Report Tracker & Analyzer");
    expect(content).toContain("application/ld+json");
    expect(content.toLowerCase()).toContain("sugar");

    // Verify SEO robots, sitemap, and static marker guide routes exist
    expect(fs.existsSync(path.resolve(process.cwd(), "app/robots.ts"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/markers/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/markers/[slug]/page.tsx"))).toBe(true);
    const sitemapContent = fs.readFileSync(path.resolve(process.cwd(), "app/sitemap.ts"), "utf-8");
    expect(sitemapContent).toContain("/markers/");
  });

  it("provides simple layman-friendly explanations for every dictionary test and unlisted custom tests", () => {
    // Every test in METRIC_DICTIONARY returns a clear non-empty explanation
    for (const def of Object.values(METRIC_DICTIONARY)) {
      const text = getLaymanExplanation(def.canonicalKey, def.displayName, def.category);
      expect(text.length).toBeGreaterThan(20);
    }

    // Unlisted custom/urine test gets smart heuristic layman explanation without LLM
    const urineText = getLaymanExplanation("urine_specific_gravity", "Urine Specific Gravity", "Kidney");
    expect(urineText.toLowerCase()).toContain("urine");

    const customLiverText = getLaymanExplanation("custom_liver_test", "Liver Panel Marker", "Liver");
    expect(customLiverText.toLowerCase()).toContain("liver");
  });

  it("renders MetricDetailModal info row with light yellow gradient and Read more toggle", () => {
    const mockSummary: LatestResultSummary = {
      metricKey: "creatinine",
      displayName: "Serum Creatinine",
      category: "Kidney",
      standardUnit: "mg/dL",
      latestResult: {
        id: 1,
        reportId: 1,
        metricKey: "creatinine",
        displayName: "Serum Creatinine",
        value: 1.0,
        unit: "mg/dL",
        refLow: 0.7,
        refHigh: 1.3,
        flag: "normal",
        category: "Kidney",
        reportDate: "2025-01-20",
        fileName: "Lab_Jan2025.pdf",
      },
      historyCount: 1,
    };

    render(
      <MetricDetailModal
        summary={mockSummary}
        history={[mockSummary.latestResult]}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const explanation = getLaymanExplanation("creatinine", "Serum Creatinine", "Kidney");
    const infoPara = screen.getByText(explanation);
    expect(infoPara).toBeDefined();
    expect(infoPara.className).toContain("line-clamp-1");
    expect(infoPara.parentElement?.className).toContain("from-amber-50");

    // Read more button on the right expands and toggles to Show less
    const readMoreBtn = screen.getByRole("button", { name: /Read more/i });
    fireEvent.click(readMoreBtn);
    expect(infoPara.className).not.toContain("line-clamp-1");
    expect(screen.getByRole("button", { name: /Show less/i })).toBeDefined();
  });

  it("Navbar renders sideways language switcher above Appearance with all 12 languages", () => {
    usePreferenceStore.setState({ language: "en" });

    render(
      <Navbar
        activeTab="home"
        onSelectTab={() => {}}
        onOpenUpload={() => {}}
      />
    );

    expect(APP_LANGUAGES).toHaveLength(12);
    const expectedNames = [
      "English",
      "Hindi",
      "Tamil",
      "Telugu",
      "Kannada",
      "Malayalam",
      "Punjabi",
      "Marathi",
      "French",
      "German",
      "Spanish",
      "Mandarin",
    ];

    const langBtn = screen.getByRole("button", { name: /Change app language/i });
    fireEvent.click(langBtn);

    const listbox = screen.getByRole("listbox", { name: /App language/i });
    expect(listbox).toBeDefined();

    for (const langName of expectedNames) {
      expect(listbox.textContent).toContain(langName);
    }

    // Switching to French updates UI label cleanly
    fireEvent.click(screen.getByRole("option", { name: /French/i }));
    expect(usePreferenceStore.getState().language).toBe("fr");
    expect(screen.getAllByText("Accueil").length).toBeGreaterThanOrEqual(1);

    // Restore to English for clean state
    usePreferenceStore.setState({ language: "en" });
  });

  it("translates biomarker test names, flags, deltas, and layman explanations into selected language", () => {
    usePreferenceStore.setState({ language: "hi" });

    const summary: LatestResultSummary = {
      metricKey: "hemoglobin",
      displayName: "Hemoglobin",
      category: "Blood",
      standardUnit: "g/dL",
      latestResult: {
        id: 1,
        reportId: 2,
        metricKey: "hemoglobin",
        displayName: "Hemoglobin",
        value: 11.2,
        unit: "g/dL",
        refLow: 13.5,
        refHigh: 17.5,
        flag: "low",
        category: "Blood",
        reportDate: "2025-01-20",
        fileName: "Jan2025.pdf",
      },
      previousResult: {
        id: 2,
        reportId: 1,
        metricKey: "hemoglobin",
        displayName: "Hemoglobin",
        value: 12.0,
        unit: "g/dL",
        refLow: 13.5,
        refHigh: 17.5,
        flag: "low",
        category: "Blood",
        reportDate: "2024-10-10",
        fileName: "Oct2024.pdf",
      },
      changeValue: -0.8,
      comparisonRelation: "since",
      historyCount: 2,
    };

    render(<BiomarkerCard summary={summary} onClick={() => {}} />);
    expect(screen.getByText(/हीमोग्लोबिन/)).toBeDefined();
    expect(screen.getByText("कम")).toBeDefined();
    expect(screen.getByText(/घटा 0.8/)).toBeDefined();

    // Also check layman test explanation in Hindi and Mandarin
    const hiExp = getLocalizedMetricExplanation("hemoglobin", "Hemoglobin", "Blood", "hi");
    expect(hiExp).toContain("ऑक्सीजन");
    const zhExp = getLocalizedMetricExplanation("creatinine", "Serum Creatinine", "Kidney", "zh");
    expect(zhExp).toContain("肾脏");

    usePreferenceStore.setState({ language: "en" });
  });

  it("translates every METRIC_DICTIONARY marker and unseen dynamic lab tests across all 12 languages", () => {
    const keys = Object.keys(METRIC_DICTIONARY);
    for (const lang of APP_LANGUAGES) {
      for (const key of keys) {
        const def = METRIC_DICTIONARY[key];
        const translated = getLocalizedMetricName(key, def.displayName, lang.code);
        expect(translated.length).toBeGreaterThan(0);
        if (lang.code !== "en") {
          const exp = getLocalizedMetricExplanation(key, def.displayName, def.category, lang.code);
          expect(exp.length).toBeGreaterThan(10);
        }
      }
    }

    // Dynamic unseen blood test name & explanation translation
    const hiDynamic = translateDynamicTestName("Serum Lipase Level", "hi");
    expect(hiDynamic).toContain("सीरम");
    const frDynamicExp = getLocalizedMetricExplanation(
      "custom_serum_lipase",
      "Serum Lipase",
      "Other",
      "fr"
    );
    expect(frDynamicExp.length).toBeGreaterThan(15);
  });

  it("enforces the 2-report guest limit and shows sign-up prompt banner without false local-only claims", () => {
    expect(MAX_GUEST_REPORTS).toBe(2);
    expect(hasReachedGuestReportLimit(0, false)).toBe(false);
    expect(hasReachedGuestReportLimit(1, false)).toBe(false);
    expect(hasReachedGuestReportLimit(2, false)).toBe(true);
    expect(hasReachedGuestReportLimit(5, true)).toBe(false);

    render(
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        limitReason={true}
      />
    );
    expect(screen.getByText(/Guest mode allows up to/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /^sign up$/i })).toBeDefined();
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    expect(googleBtn).toBeDefined();
    const googleLogo = googleBtn.querySelector('img[src="/google-logo.png"]');
    expect(googleLogo).not.toBeNull();

    // Ensure no misleading local-only claims remain in layout or page SEO copy
    for (const relPath of ["app/layout.tsx", "app/page.tsx", "public/manifest.json"]) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(content.toLowerCase()).not.toContain("local-first");
      expect(content.toLowerCase()).not.toContain("100% local");
      expect(content.toLowerCase()).not.toContain("stay private on your device");
    }
  });

  it("extracts optional profile demographic hints cleanly from lab header text", async () => {
    const { extractProfileHintsFromText, computeBmi } = await import("@/lib/utils/profileExtractor");
    const hints = extractProfileHintsFromText(
      "Patient Name : Ananya Sharma\nAge / Sex : 31 Y / Female\nUHID : 998877"
    );
    expect(hints.fullName).toBe("Ananya Sharma");
    expect(hints.age).toBe("31");
    expect(hints.sex).toBe("Female");
    expect(computeBmi("165", "60")).toBe("22.0");
  });

  it("renders pink SplashScreen with Gula logo on initial app load", async () => {
    const { SplashScreen } = await import("@/components/SplashScreen");
    render(<SplashScreen />);
    const status = screen.getByRole("status", { name: /Loading Gula/i });
    expect(status).toBeDefined();
    const logoImg = status.querySelector('img[src="/logo.png"]');
    expect(logoImg).not.toBeNull();
    expect(status.textContent).toContain("Your Privacy Matters");
  });

  it("navigates to homepage when clicking the Gula logo in the sidebar", () => {
    const onSelectTab = vi.fn();
    render(
      <Navbar
        activeTab="trends"
        onSelectTab={onSelectTab}
        onOpenUpload={() => {}}
      />
    );
    const logoBtn = screen.getByRole("button", { name: /Go to homepage/i });
    fireEvent.click(logoBtn);
    expect(onSelectTab).toHaveBeenCalledWith("home");
  });
});
