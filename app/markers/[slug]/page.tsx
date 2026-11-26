import type { Metadata } from "next";
import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { getLaymanExplanation } from "@/lib/db/laymanExplainer";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

interface MarkerPageProps {
  params: Promise<{ slug: string }>;
}

function formatReferenceRange(
  low: number | undefined,
  high: number | undefined,
  unit: string
): string {
  if (low !== undefined && high !== undefined) {
    return `${low} – ${high} ${unit}`.trim();
  }
  if (high !== undefined) {
    return `Below ${high} ${unit}`.trim();
  }
  if (low !== undefined) {
    return `Above ${low} ${unit}`.trim();
  }
  return `Measured in ${unit}`;
}

export async function generateStaticParams() {
  return Object.keys(METRIC_DICTIONARY).map((key) => ({ slug: key }));
}

export async function generateMetadata({
  params,
}: MarkerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const def = METRIC_DICTIONARY[slug];
  if (!def) {
    return {
      title: "Biomarker Not Found",
    };
  }

  const rangeStr = formatReferenceRange(
    def.defaultLow,
    def.defaultHigh,
    def.standardUnit
  );
  const layman = getLaymanExplanation(
    def.canonicalKey,
    def.displayName,
    def.category
  );

  return {
    title: `${def.displayName} Normal Range, Meaning & Test Guide`,
    description: `${def.displayName} (${def.category}): typical adult range ${rangeStr}. ${layman} Track ${def.displayName} across blood reports free in Gula.`,
    alternates: {
      canonical: `/markers/${def.canonicalKey}`,
    },
    keywords: [
      def.displayName,
      `${def.displayName} normal range`,
      `${def.displayName} blood test`,
      ...def.aliases.slice(0, 4),
      "Gula blood test tracker",
    ],
  };
}

async function MarkerDetailContent({ params }: MarkerPageProps) {
  const { slug } = await params;
  const def = METRIC_DICTIONARY[slug];
  if (!def) notFound();

  const layman = getLaymanExplanation(
    def.canonicalKey,
    def.displayName,
    def.category
  );
  const rangeStr = formatReferenceRange(
    def.defaultLow,
    def.defaultHigh,
    def.standardUnit
  );

  const relatedMarkers = Object.values(METRIC_DICTIONARY)
    .filter(
      (m) => m.category === def.category && m.canonicalKey !== def.canonicalKey
    )
    .slice(0, 6);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is ${def.displayName} in a blood test?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${def.description} In simple terms: ${layman}`,
        },
      },
      {
        "@type": "Question",
        name: `What is the typical reference range for ${def.displayName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `A common adult reference range for ${def.displayName} is ${rangeStr}. Always compare your result against the exact reference interval printed by your laboratory.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="space-y-6">
        <div className="space-y-2.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--accent-subtle)] text-[var(--accent)]">
            {def.category} Panel
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {def.displayName} Blood Test: Normal Range &amp; Simple Guide
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {def.description}
          </p>
        </div>

        {/* Plain-language explainer box */}
        <section
          aria-labelledby="what-it-means"
          className="p-5 rounded-xl border border-amber-200/70 dark:border-amber-400/20 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-transparent dark:from-amber-400/10 dark:via-amber-400/5 dark:to-transparent space-y-1.5"
        >
          <h2
            id="what-it-means"
            className="text-[14px] font-semibold text-[var(--text-primary)]"
          >
            What {def.displayName} means in plain language
          </h2>
          <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
            {layman}
          </p>
        </section>

        {/* Reference Range & Lab Details */}
        <section
          aria-labelledby="reference-range"
          className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4"
        >
          <h2
            id="reference-range"
            className="text-[15px] font-semibold text-[var(--text-primary)]"
          >
            Typical Adult Reference Range
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <span className="block text-[11px] text-[var(--text-muted)]">
                Reference range
              </span>
              <span className="block text-[14px] font-semibold text-[var(--text-primary)] mt-0.5 tabular-nums">
                {rangeStr}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <span className="block text-[11px] text-[var(--text-muted)]">
                Standard unit
              </span>
              <span className="block text-[14px] font-semibold text-[var(--text-primary)] mt-0.5">
                {def.standardUnit || "Unitless"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <span className="block text-[11px] text-[var(--text-muted)]">
                Panel category
              </span>
              <span className="block text-[14px] font-semibold text-[var(--text-primary)] mt-0.5">
                {def.category}
              </span>
            </div>
          </div>

          {def.aliases.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                Also appears on lab PDFs as
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {def.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[11.5px] text-[var(--text-secondary)]"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Track {def.displayName} across your blood reports
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Upload a diagnostic PDF to plot {def.displayName} trends, check out-of-range flags, and read explanations in 12 languages.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[13px] font-medium shrink-0 hover:opacity-95 transition-opacity"
          >
            <span>Open Gula Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* Related markers in same panel */}
        {relatedMarkers.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Related {def.category} Markers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {relatedMarkers.map((rel) => (
                <Link
                  key={rel.canonicalKey}
                  href={`/markers/${rel.canonicalKey}`}
                  className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {rel.displayName}
                    </p>
                    <p className="text-[11.5px] text-[var(--text-muted)] truncate">
                      {formatReferenceRange(rel.defaultLow, rel.defaultHigh, rel.standardUnit)}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

export default function MarkerDetailGuidePage({ params }: MarkerPageProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/markers"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Blood Test Guides</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[12.5px] font-medium hover:opacity-95 transition-opacity"
          >
            <span>Track in Gula</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-24 rounded bg-[var(--bg-card-subtle)]" />
              <div className="h-8 w-2/3 rounded bg-[var(--bg-card-subtle)]" />
              <div className="h-24 w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]" />
            </div>
          }
        >
          <MarkerDetailContent params={params} />
        </Suspense>

        <footer className="pt-6 border-t border-[var(--border-subtle)] flex items-start gap-2.5 text-[12px] text-[var(--text-muted)] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[var(--status-normal-dot)] shrink-0 mt-0.5" />
          <p>
            For educational tracking only &mdash; Gula does not diagnose, treat, or replace medical advice. Reference intervals differ across laboratories, age groups, and clinical guidelines (WHO/NIH).
          </p>
        </footer>
      </main>
    </div>
  );
}
