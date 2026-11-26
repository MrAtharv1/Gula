# Gula — Blood Test Report Tracker & Analyzer

> **Local-first blood test report analyzer, longitudinal health dashboard, and physician-ready PDF exporter.**  
> Zero LLM. Zero third-party ads or trackers. All PDF parsing runs directly in your browser or Android WebView, with optional cross-device sync via Supabase.

---

## Key Features

- **Zero-LLM Browser PDF Parser (`PDF.js`):** Deterministic spatial table extraction reads digital lab PDFs locally—classifying result pages vs. cover/marketing/interpretation pages, inheriting column layouts across continuation pages, preserving qualitative values (`Negative`, `Pale yellow`, `4-6 /hpf`), extracting methods & multi-tier ranges, and separating urine vs. blood markers.
- **Full-Name Biomarker Dashboard:** Displays full biomarker names with short forms in brackets (e.g., `Mean Corpuscular Volume (MCV)`, `White Blood Cell Count (WBC)`), range bars, sparklines, status badges (`Normal`, `Borderline`, `High`, `Low`), and report-to-report deltas.
- **Trends & Multi-Metric Comparisons:** Single-metric history charts with reference range shading, up-to-4-metric normalized overlay charts (`MultiMetricTrendChart`), and side-by-side two-report delta comparisons (`ReportCompareView`).
- **Doctor-Readable PDF Export:** Generates a printable landscape PDF summary (`gula-doctor-report-*.pdf`) featuring a **GULA : Blood Test Report Tracker & Analyzer** cover page, patient profile & notes, out-of-range highlights, chronological report list, reference ranges, sparkline trends, and formatted dates (`10 Oct 2020`).
- **12 Languages & Plain-Language Explainers:** Supports UI and plain-language biomarker explanations across 12 languages (`en`, `hi`, `ta`, `te`, `kn`, `ml`, `pa`, `mr`, `fr`, `de`, `es`, `zh`).
- **My Account, Local Profile & Privacy Policy:** Per-account isolated `About me` profile fields (name, age, biological sex, blood group, height/weight/BMI, notes) and device-uploaded avatar DP, unit converters (`mg/dL` <-> `mmol/L`), undo/restore history, JSON/CSV backups, one-click data wipe, and an explicit 6-point Privacy Policy.
- **Guest Mode & Optional Cloud Sync (PKCE):** Use up to 2 reports locally as a guest (stored in **Dexie IndexedDB** `Gula_DB`), or sign in with **Email/Password** or **Google OAuth (PKCE)** to sync across devices via Supabase with merge/fresh conflict resolution.
- **SEO Biomarker Guides:** Server-rendered and statically generated public reference guides at `/markers` and `/markers/[slug]`, plus `/robots.txt` and `/sitemap.xml`.
- **Android Mobile App (Capacitor):** Bundled static export wrapped with Capacitor Android, featuring a branded pink Splash Screen, mobile-accessible Sign in / Appearance / Language controls in **My Account**, Google OAuth PKCE deep links (`com.gula.health://auth-callback`), and hardware back-button support.

---

## Quick Start

### Prerequisites
- **Node.js** 20+
- **npm** 9+
- **Java JDK 21 + Android SDK** *(only needed when building Android `.apk` / `.aab`)*

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Supabase environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
# If omitted, Gula runs in offline local-first mode with an in-memory mock sync store.

# 3. Start development server
npm run dev
# Visit http://localhost:3000
```

### Verification & Builds

```bash
# Run full test suite (235 tests across 21 test files)
npm test

# Type-check with Next.js route types
npx next typegen && npx tsc --noEmit

# Production Next.js web build
npm run build
npm run start -- -p 3000

# Build static export and sync Android Capacitor assets
npm run build:apk

# Build signed Android APK & Play Store AAB (requires android/keystore.properties)
cd android && ./gradlew assembleRelease bundleRelease --no-daemon
```

---

## Project Structure

```
healthtracker/
├── app/
│   ├── layout.tsx                    # Root layout, SEO JSON-LD, theme init, PWA metadata
│   ├── page.tsx                      # App shell (Home, Trends, My Account, Export PDF, Sync)
│   ├── globals.css                   # Tailwind v4 design tokens & CSS variables
│   ├── markers/                      # Public SEO biomarker guide pages (/markers & /markers/[slug])
│   ├── robots.ts                     # Search engine crawler directives
│   └── sitemap.ts                    # Dynamic XML sitemap for marker guides
├── components/
│   ├── ui/                           # Badge, Button, Card, EmptyState, Modal, RangeBar, Sparkline, Toast
│   ├── AuthModal.tsx                 # Email/Password & Google OAuth modal
│   ├── BiomarkerCard.tsx             # Biomarker card (full name + bracketed short form, range bar)
│   ├── BiomarkerTrendChart.tsx       # Recharts single-metric longitudinal chart
│   ├── CapacitorBridge.tsx           # Android status bar, PKCE deep-link handler & back navigation
│   ├── HomeDashboardView.tsx         # Categorized home overview with status filters
│   ├── ManualEntryModal.tsx          # Manual biomarker entry form
│   ├── MetricDetailModal.tsx         # Detailed metric view, layman explainer & unit toggle
│   ├── MultiMetricTrendChart.tsx     # Up to 4-metric overlay trend comparison chart
│   ├── Navbar.tsx                    # Desktop sidebar + mobile bottom tab bar
│   ├── PdfPreview.tsx                # Multi-page PDF canvas viewer via PDF.js
│   ├── ReportCompareView.tsx         # Side-by-side comparison across two reports
│   ├── ServiceWorkerRegister.tsx     # Browser PWA SW lifecycle (auto-disabled inside Capacitor APK)
│   ├── SettingsView.tsx              # My Account (mobile quick controls, About me, DP, Reports, Units, Data, Privacy)
│   ├── SingleMetricTrendsView.tsx    # Collapsible panel table & mobile card trends + PDF export
│   ├── SplashScreen.tsx              # Branded launch screen overlay
│   ├── SyncMergeModal.tsx            # First sign-in conflict dialog (Merge vs. Start fresh)
│   └── UploadModal.tsx               # Multi-step PDF upload, review & duplicate detection flow
├── lib/
│   ├── db/
│   │   ├── duplicateDetection.ts     # Duplicate check using report date & test values
│   │   ├── index.ts                  # Dexie IndexedDB repository (Gula_DB + HealthTrack_V2_DB migration)
│   │   ├── laymanExplainer.ts        # Plain-language explanations across 80+ markers
│   │   ├── metricDictionary.ts       # Canonical dictionary, aliases, unit defaults & key alias mapping
│   │   ├── schema.ts                 # Report, Result & Summary TypeScript schemas
│   │   └── unitConversion.ts         # mg/dL <-> mmol/L bidirectional conversions
│   ├── i18n/
│   │   ├── metricTranslations.ts     # Biomarker titles & explanations in 12 languages
│   │   └── translations.ts           # Full UI translations in 12 languages
│   ├── parser/
│   │   ├── dateDetector.ts           # Sample collection & report date extractor
│   │   ├── labDetector.ts            # Lab name detector (25+ Indian & US labs + generic fallback)
│   │   ├── layoutAdaptiveExtractor.ts# Dynamic X-column table extractor with headerless page inheritance
│   │   ├── lineCleaner.ts            # Non-result banner & administrative line filter
│   │   ├── nameNormalizer.ts         # Context-aware normalization (blood vs. urine, % vs. absolute)
│   │   ├── pageClassifier.ts         # Page classifier (detail tables, summary tables, noise skip)
│   │   ├── pdfParser.ts              # Main deterministic parser orchestrator + PII scrubbing
│   │   ├── rangeExtractor.ts         # Multi-tier & interval reference range extractor
│   │   ├── textExtractor.ts          # PDF.js spatial coordinate text extractor
│   │   ├── types.ts                  # Parser input/output interfaces
│   │   └── valueRangeParser.ts       # Numeric/qualitative values, flags & unit normalizer
│   ├── store/                        # Zustand stores (preferences per account, theme, sync, toast)
│   ├── sync/
│   │   ├── supabaseClient.ts         # Supabase PKCE client, Email/Google OAuth & mock fallback
│   │   ├── syncEngine.ts             # Background sync, lazy PDF download & account deletion
│   │   └── types.ts                  # Sync models & states
│   └── utils/
│       ├── doctorPdfExport.ts        # Multi-page physician-ready PDF report generator
│       └── profileExtractor.ts       # Client-side demographic hint extraction & BMI calculator
├── android/                          # Capacitor Android Studio & Gradle project
├── scripts/build-apk-web.mjs         # Static export helper for Capacitor Android builds
├── supabase/schema.sql               # Postgres DDL, RLS policies & private storage bucket rules
└── tests/                            # 21 Vitest suites (235 tests)
```

---

## Supabase Setup & Security Architecture

Database tables and Row-Level Security policies live in [supabase/schema.sql](supabase/schema.sql):

1. **Tables & RLS:** `public.reports` and `public.results` both enforce `auth.uid() = user_id` across `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
2. **Private PDF Storage:** Bucket `healthtrack-reports` (`public = false`) restricts PDF object access using owner-scoped RLS policies.
3. **Authentication & PKCE:** [lib/sync/supabaseClient.ts](lib/sync/supabaseClient.ts) initializes Supabase Auth with `flowType: "pkce"` for both web and mobile OAuth (`com.gula.health://auth-callback`).
4. **Encryption Scope:** Signed-in cloud records and PDFs are protected by **HTTPS/TLS in transit** and **standard server-side encryption at rest** managed by Supabase—Gula does **not** use client-side zero-knowledge / end-to-end encryption.
5. **Local Storage vs. IndexedDB:** Lab reports, biomarker readings, reference ranges, and PDF blobs stay in **Dexie IndexedDB** (`Gula_DB`). Only Supabase auth tokens, theme (`healthtrack-theme`), and UI/profile preferences (`healthtrack_preferences`) are stored in `localStorage`.

> **Pre-Release Check:** Always verify live RLS isolation in your Supabase project using two separate user accounts to confirm neither account can query the other's rows or download files from `healthtrack-reports`.

---

## Adding New Biomarkers or Aliases

1. **Dashboard, Reference Ranges & SEO Guides ([lib/db/metricDictionary.ts](lib/db/metricDictionary.ts)):** Add or update entries inside `METRIC_DICTIONARY` (`canonicalKey`, `displayName`, `category`, `standardUnit`, `defaultLow`, `defaultHigh`, `aliases`, `description`).
2. **PDF Parser Recognition ([lib/parser/nameNormalizer.ts](lib/parser/nameNormalizer.ts)):** Mirror the `canonicalKey`, `category`, and lab aliases inside `KNOWN_METRICS` (or add a key mapping in `METRIC_KEY_ALIASES` inside [lib/db/metricDictionary.ts](lib/db/metricDictionary.ts)) so PDF uploads resolve cleanly into longitudinal trends and 12-language explanations.

---

## Medical Disclaimer

Gula is an educational and personal health-tracking tool. Reference intervals vary across laboratories and patient populations. Always review original diagnostic PDFs and consult a qualified clinician for medical interpretation, diagnosis, or treatment decisions.
