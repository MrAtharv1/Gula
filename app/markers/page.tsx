import type { Metadata } from "next";
import Link from "next/link";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { getLaymanExplanation } from "@/lib/db/laymanExplainer";
import { MetricCategory, MetricDefinition } from "@/lib/db/schema";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Blood Test Biomarker Directory & Normal Ranges",
  description:
    "Browse normal reference ranges and plain-language explanations for 65+ blood tests including HbA1c, glucose, LDL, HDL, SGPT, SGOT, TSH, creatinine, and CBC.",
  alternates: {
    canonical: "/markers",
  },
};

const PANEL_ORDER: { category: MetricCategory; heading: string; intro: string }[] = [
  {
    category: "Sugar",
    heading: "Diabetes & Blood Sugar Tests",
    intro: "Track HbA1c, fasting glucose, post-meal sugar, and insulin resistance over time.",
  },
  {
    category: "Lipids",
    heading: "Cholesterol & Lipid Profile",
    intro: "Understand total cholesterol, LDL, HDL, triglycerides, VLDL, and ApoB cardiovascular markers.",
  },
  {
    category: "Blood",
    heading: "Complete Blood Count (CBC) & Hematology",
    intro: "Check hemoglobin, RBC, WBC, platelets, MCV, and differential white blood cell counts.",
  },
  {
    category: "Liver",
    heading: "Liver Function Tests (LFT)",
    intro: "Monitor SGPT (ALT), SGOT (AST), ALP, GGT, bilirubin, albumin, and total protein.",
  },
  {
    category: "Kidney",
    heading: "Kidney Function & Electrolytes (KFT)",
    intro: "Follow serum creatinine, eGFR, BUN, uric acid, sodium, potassium, and calcium.",
  },
  {
    category: "Thyroid",
    heading: "Thyroid Panel",
    intro: "Track TSH, Free T3, Free T4, Total T3/T4, and thyroid antibodies.",
  },
  {
    category: "Vitamins",
    heading: "Vitamins & Iron Studies",
    intro: "Check Vitamin D, Vitamin B12, folate, ferritin, serum iron, and TIBC.",
  },
  {
    category: "Hormones",
    heading: "Hormone Panel",
    intro: "Monitor testosterone, cortisol, DHEA-S, FSH, LH, and prolactin.",
  },
  {
    category: "Other",
    heading: "Inflammation & General Markers",
    intro: "Track hs-CRP and additional general health markers.",
  },
];

export default function MarkersDirectoryPage() {
  const byCategory = new Map<MetricCategory, MetricDefinition[]>();
  for (const def of Object.values(METRIC_DICTIONARY)) {
    const list = byCategory.get(def.category) || [];
    list.push(def);
    byCategory.set(def.category, list);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Gula Dashboard</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[12.5px] font-medium hover:opacity-95 transition-opacity"
          >
            <span>Upload Lab PDF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <section className="space-y-3 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Gula Lab Reference Library
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Understand Your Blood Test Report &amp; Normal Ranges
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            Explore plain-language explanations and typical adult reference ranges for common blood tests. Upload your own diagnostic PDF in Gula to see which markers are normal, high, or low and compare checkups over time.
          </p>
        </section>

        <div className="space-y-9">
          {PANEL_ORDER.map((panel) => {
            const markers = byCategory.get(panel.category) || [];
            if (markers.length === 0) return null;
            return (
              <section key={panel.category} className="space-y-3.5">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {panel.heading}
                  </h2>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                    {panel.intro}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {markers.map((m) => {
                    const hasRange = m.defaultLow !== undefined || m.defaultHigh !== undefined;
                    const rangeLabel =
                      m.defaultLow !== undefined && m.defaultHigh !== undefined
                        ? `${m.defaultLow}–${m.defaultHigh} ${m.standardUnit}`
                        : m.defaultHigh !== undefined
                        ? `< ${m.defaultHigh} ${m.standardUnit}`
                        : m.defaultLow !== undefined
                        ? `> ${m.defaultLow} ${m.standardUnit}`
                        : m.standardUnit;

                    return (
                      <Link
                        key={m.canonicalKey}
                        href={`/markers/${m.canonicalKey}`}
                        className="group p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] shadow-[var(--shadow-sm)] transition-all flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                              {m.displayName}
                            </h3>
                            {hasRange && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] tabular-nums shrink-0">
                                {rangeLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                            {getLaymanExplanation(m.canonicalKey, m.displayName, m.category)}
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--accent)]">
                          <span>Read range &amp; guide</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="pt-6 border-t border-[var(--border-subtle)] flex items-start gap-2.5 text-[12px] text-[var(--text-muted)] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[var(--status-normal-dot)] shrink-0 mt-0.5" />
          <p>
            Reference ranges vary slightly by lab methodology, age, and sex — always check the printed reference range on your lab report and consult a qualified doctor for medical diagnosis or treatment decisions.
          </p>
        </footer>
      </main>
    </div>
  );
}
