# Gula

> **Private, local-first health test report tracker.**  
> Turn laboratory diagnostic PDF reports into a clean, trackable personal health dashboard.  
> **100% private. Zero LLM. Zero paid APIs. Local-first architecture: all processing and primary storage occur in-browser with optional cross-device cloud sync.**

---

## Architecture & Principles

- **Local-First & Offline**: All PDF text extraction, spatial row reconstruction, biomarker normalization, and primary storage run in the browser using **PDF.js** and **Dexie (IndexedDB: `Gula_DB`)**. The app remains fully functional, fast, and offline-capable without an account.
- **Backward-Compatible Database Migration**: On existing installs, Gula automatically detects legacy data in `HealthTrack_V2_DB` and migrates all test reports and results to `Gula_DB` without losing any user records.
- **Optional Accounts & Cloud Sync**:
  - **Optional Authentication**: Sign in via email magic link or Google OAuth. Signing in is strictly optional; the app works completely signed out.
  - **Local-First Write-Through**: All report uploads, test results, and status updates write to local IndexedDB first, then synchronize to the cloud in the background.
  - **Lazy PDF Storage**: Original PDF documents are uploaded to private cloud storage (Supabase Storage) and downloaded lazily only when the user taps *"View PDF"*.
  - **Bi-Directional Status Sync**: Undoing or restoring a report on a phone updates the report status across all connected PCs within seconds.
  - **Never-Silent Conflict Resolution**: On first sign-in with existing local data, prompts: *"Merge with your account"* or *"Start fresh"*.
  - **Security & Row-Level Security (RLS)**: Enforced per-user isolation where users can only view, insert, update, and delete their own rows and files.
  - **Account & Cloud Data Deletion**: Dedicated 1-click permanent erasure of all cloud records, storage files, and user auth.
- **Zero LLM / Zero External AI**: Clinical biomarker parsing relies on deterministic spatial coordinate clustering, regex tokenization, and an extensive clinical alias dictionary covering 65+ biomarkers.
- **Design Language**: Apple, Linear, and Vercel aesthetic. Muted neutral palette, hairline 1px borders, subtle shadows, rounded-2xl cards, soft status badges (Emerald normal, Amber borderline, Rose needs attention), and zero flash on load.
- **Responsive Navigation**: Native app feel on smartphones (bottom tab bar, 44px+ touch targets) and wide productivity layouts on tablets and 1440px desktop screens (slim sidebar navigation).
- **Progressive Web App (PWA)**: Installable directly to phone or desktop home screens with offline caching for core assets and workers.

---

## Quick Start

### Prerequisites
- **Node.js** 18.18+ or 20+
- **npm** 9+

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Supabase Environment Variables in .env.local
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Note: If omitted, Gula runs in offline local-first mode with built-in test mock sync.

# 3. Run local development server
npm run dev

# 4. Open in browser
# Visit http://localhost:3000
```

### Production Build & Verification

```bash
# Build optimized production bundle
npm run build

# Start production server
npm run start -- -p 3000

# Execute full test suite (114 tests across 12 test suites)
npm test -- --run
```

---

## Folder Structure

```
healthtracker/
├── app/                              # Next.js App Router root
│   ├── layout.tsx                    # Root layout, fonts, PWA metadata, theme init script
│   ├── page.tsx                      # Primary shell (Home, Trends, Settings, Sync engine)
│   ├── globals.css                   # Tailwind v4 theme tokens, CSS variables, utilities
│   ├── error.tsx                     # Next.js route-level error boundary
│   └── global-error.tsx              # Root HTML critical error boundary
├── components/                       # UI Component Library
│   ├── ui/                           # Reusable design system primitives
│   │   ├── Badge.tsx                 # Health status indicator badges
│   │   ├── Button.tsx                # Primary, secondary, ghost, danger buttons
│   │   ├── Card.tsx                  # Rounded-2xl hairline cards
│   │   ├── EmptyState.tsx            # Clean, illustration-free empty states
│   │   ├── Modal.tsx                 # Responsive sheet (bottom on mobile, modal on desktop)
│   │   ├── RangeBar.tsx              # Slim clinical biomarker reference range bar
│   │   ├── Skeleton.tsx              # Accessible pulsing shimmer placeholders
│   │   ├── Sparkline.tsx             # Inline SVG longitudinal sparkline
│   │   └── Toast.tsx                 # Actionable notification toasts
│   ├── BiomarkerCard.tsx             # Biomarker card with sparkline, status & delta
│   ├── BiomarkerTrendChart.tsx       # Recharts longitudinal chart with normal range band
│   ├── DashboardSkeleton.tsx         # Initial loading skeleton view
│   ├── ErrorBoundary.tsx             # React error boundary with retry capability
│   ├── ManualEntryModal.tsx          # Fast manual biomarker logger
│   ├── MetricDetailModal.tsx         # Deep-dive metric modal with unit conversions
│   ├── MultiMetricTrendChart.tsx     # Overlay up to 4 metrics (raw & normalized modes)
│   ├── Navbar.tsx                    # Responsive nav (bottom bar on mobile, sidebar on desktop)
│   ├── PdfPreview.tsx                # Multi-page canvas PDF renderer using PDF.js
│   ├── ReportCompareView.tsx         # Side-by-side delta comparison of two checkup dates
│   ├── ServiceWorkerRegister.tsx     # PWA Service Worker lifecycle registration
│   ├── SettingsView.tsx              # Settings, Auth & Sync, Undo manager, export, wipe
│   ├── SyncMergeModal.tsx            # First sign-in conflict resolution (Merge vs Fresh)
│   ├── ThemeProvider.tsx             # System/light/dark theme provider
│   ├── ThemeToggle.tsx               # Minimal 3-way theme toggle
│   └── UploadModal.tsx               # 3-step upload sheet (file pick, preview, parse)
├── lib/
│   ├── db/                           # Dexie IndexedDB layer (Gula_DB with legacy migration)
│   │   ├── duplicateDetection.ts     # Ingest duplicate detector based on date & tests
│   │   ├── index.ts                  # Dexie repository methods (CRUD, undo, sync & migration)
│   │   ├── metricDictionary.ts       # 65+ clinical metrics, aliases, bounds & descriptions
│   │   ├── schema.ts                 # TypeScript data models, sync queue & category types
│   │   └── unitConversion.ts         # mg/dL <-> mmol/L bidirectional converters
│   ├── parser/                       # Zero-LLM In-Browser PDF Parsing Engine
│   │   ├── dateDetector.ts           # Clinical report date detector (DD/MM/YYYY, etc.)
│   │   ├── labDetector.ts            # Diagnostic lab detection (Lal, Metropolis, Thyrocare...)
│   │   ├── lineCleaner.ts            # Text normalization and noise stripper
│   │   ├── pdfParser.ts              # Spatial row reconstruction and result parser
│   │   ├── rangeExtractor.ts         # Numeric reference range parser ("13-17", "<200", etc.)
│   │   ├── textExtractor.ts          # PDF.js text extraction with (x, y) coordinates
│   │   └── types.ts                  # Parser input/output interfaces
│   ├── store/                        # State stores
│   │   ├── preferenceStore.ts        # Unit preferences (glucose, cholesterol)
│   │   ├── syncStore.ts              # User, sync status (synced, syncing, offline), merge state
│   │   ├── themeStore.ts             # Theme state (light / dark / system)
│   │   └── toastStore.ts             # Toast notification queue
│   ├── sync/                         # Local-First Cloud Sync Layer
│   │   ├── supabaseClient.ts         # Supabase client, auth providers, storage, mock fallback
│   │   ├── syncEngine.ts             # Bi-directional sync worker, lazy PDF downloader, wipe
│   │   └── types.ts                  # Cloud entity types and sync status definitions
│   └── utils/
│       ├── cn.ts                     # Class name merger helper
│       ├── date.ts                   # Date formatting helper
│       └── trends.ts                 # Pure mathematical trend sequence detector
├── public/                           # Static assets
│   ├── icons/                        # PWA maskable icons (192x192, 512x512, SVG)
│   ├── manifest.json                 # Web App Manifest
│   ├── pdf.worker.min.mjs            # Local PDF.js Web Worker (no external CDN)
│   └── sw.js                         # PWA Service Worker for offline caching
├── supabase/
│   └── schema.sql                    # SQL DDL, RLS policies, and storage bucket configuration
└── tests/                            # Comprehensive Vitest test suites (114 tests)
    ├── data-layer.test.ts            # IndexedDB transactions, repository, units
    ├── design-system.test.tsx        # UI tokens, buttons, modal, badges
    ├── home-dashboard-phase4.test.tsx# RangeBar, sparkline, cards, category sections
    ├── migration.test.ts             # IndexedDB migration from HealthTrack_V2_DB to Gula_DB
    ├── parser-phase3.test.ts         # Clinical lab fixtures, ranges, spatial parsing
    ├── parser.test.ts                # Date parsing, lab detection, line cleaner
    ├── phase7-pwa-qa.test.tsx        # PWA, viewports (375px-1440px), error boundaries, QA
    ├── phase8-accounts-sync.test.tsx # Optional auth, write-through, lazy PDF, status sync, merge
    ├── settings-undo-phase6.test.tsx # Multi-step undo, restore, export, wipe
    ├── trends-phase5.test.tsx        # Recharts trends, math insights, overlays
    ├── upload-flow.test.tsx          # Upload modal validations, duplicates, errors
    └── utils.test.ts                 # Helper functions
```

---

## Supabase Setup & Security Configuration

Gula includes production-ready database schema and Row-Level Security policies in [`supabase/schema.sql`](file:///c:/Users/intel/vscodews/healthtracker/supabase/schema.sql).

### 1. Database Tables & Row-Level Security
- `reports`: Tracks report metadata, test dates, lab names, status (`active` | `undone`), and PDF cloud paths. RLS restricts access to `auth.uid() = user_id`.
- `results`: Tracks individual biomarker readings linked to `reports.id`. RLS restricts access to `auth.uid() = user_id`.

### 2. Storage Bucket
- `healthtrack-reports`: Private bucket storing original PDFs under `${auth.uid()}/${reportId}.pdf`. RLS restricts upload, download, and deletion strictly to the authenticated owner.

### 3. Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## How to Add New Metric Aliases

All clinical metric definitions and alias mappings reside in [`lib/db/metricDictionary.ts`](file:///c:/Users/intel/vscodews/healthtracker/lib/db/metricDictionary.ts).

To add a new biomarker or expand alias recognition for an existing one:

### 1. Adding an Alias to an Existing Biomarker
Locate the metric entry in `METRIC_DICTIONARY` and add lowercased search aliases into its `aliases` array:

```ts
// Example: Adding "hgb blood" and "total hb" to hemoglobin
hemoglobin: {
  canonicalKey: "hemoglobin",
  displayName: "Hemoglobin",
  category: "Blood",
  standardUnit: "g/dL",
  defaultLow: 13.0,
  defaultHigh: 17.0,
  aliases: [
    "hemoglobin",
    "haemoglobin",
    "hb",
    "hgb",
    "hgb blood", // <- New alias
    "total hb",   // <- New alias
  ],
  description: "Oxygen-carrying protein in red blood cells.",
}
```

### 2. Adding a Completely New Biomarker
Append a new entry with its category, reference intervals, aliases, and a concise plain-English explanation ($\le 20$ words):

```ts
lipoprotein_a: {
  canonicalKey: "lipoprotein_a",
  displayName: "Lipoprotein (a)",
  category: "Lipids",
  standardUnit: "mg/dL",
  defaultHigh: 30.0,
  aliases: [
    "lipoprotein a",
    "lipoprotein (a)",
    "lp(a)",
    "lpa",
  ],
  description: "Genetic variant of LDL cholesterol associated with cardiovascular risk.",
},
```

---

## Final QA & Sync Verification Checklist

All QA and Sync scenarios are verified by automated end-to-end tests:

| Scenario | Tested Condition | Result |
| :--- | :--- | :--- |
| **1. Upload Valid PDF** | Full clinical report with 20+ tests extracted with spatial coordinates | **Passed** — Ingests into IndexedDB, computes flags, updates dashboard immediately |
| **2. Scanned PDF** | Scanned document / zero selectable text detected | **Passed** — Shows calm inline notice without crash |
| **3. Non-PDF File** | Uploading non-PDF file (.png, .txt, .docx) | **Passed** — Rejected inline: *"Please upload a PDF file."* |
| **4. Password-Protected PDF** | Locked document detection and unlock dialog | **Passed** — Prompts with inline unlock form |
| **5. Duplicate Report** | Report with identical date and matching lab results | **Passed** — Warns user before creating duplicate entries |
| **6. Upload Wrong PDF + Undo** | Mistaken file uploaded, followed by "Undo last upload" | **Passed** — Reverts state across dashboard, charts, and trends instantly |
| **7. Theme Switching** | Light, Dark, and System mode transitions | **Passed** — Seamless transition, zero flash on load via inline head script |
| **8. Responsive & PWA** | Tested on 375px (iPhone SE), 393px (iPhone 15), 768px (iPad), 1440px desktop | **Passed** — Bottom nav on mobile with 44px+ tap targets, slim sidebar on desktop, full PWA manifest & worker |
| **9. Multi-Device Status Sync** | Undo/Restore on one device synchronizing to second device | **Passed** — Changes to `status` field propagate bidirectionally |
| **10. Merge vs Fresh on Sign-In** | First sign-in on a device with existing local records | **Passed** — Asks *"Merge with your account"* or *"Start fresh"*; never silently overwrites |
| **11. Database Migration** | Seamless migration from `HealthTrack_V2_DB` to `Gula_DB` | **Passed** — Existing installs preserve all historical records without data loss |

---

## Security & Privacy Guarantee

- **Local-First Guarantee**: Health reports are parsed directly within the Web Worker thread of your browser. Local IndexedDB is always the source of truth.
- **Private Cloud Account**: If signed in, your records and original PDFs are stored under your private account with Row-Level Security isolating your data.
- **No Third-Party Trackers**: No analytics scripts, no telemetry, no remote advertising trackers.
- **Medical Disclaimer**: Gula is an informational dashboard and does not provide medical advice or diagnoses.
