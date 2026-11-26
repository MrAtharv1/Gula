import type { Metadata, Viewport } from "next";
import { Geist, Karla } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SplashScreen } from "@/components/SplashScreen";
import { CapacitorBridge } from "@/components/CapacitorBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://gula.health"
  ),
  title: {
    default: "Gula: Blood Test Report Tracker & Analyzer",
    template: "%s | Gula",
  },
  description:
    "Upload your blood test PDF and get easy charts, normal-range checks, and report comparisons for HbA1c, cholesterol, liver, thyroid, CBC & kidney. Free.",
  applicationName: "Gula",
  category: "Health & Fitness",
  keywords: [
    "Gula",
    "blood test report analyzer",
    "understand blood test report",
    "compare blood test reports",
    "HbA1c tracker",
    "diabetes blood test tracker",
    "cholesterol report explained",
    "lipid profile tracker",
    "LFT report explained",
    "liver function test normal range",
    "CBC report analyzer",
    "thyroid report tracker",
    "lab report tracker app",
  ],
  authors: [{ name: "Gula Health" }],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    title: "GULA : Your Privacy Matters — Blood Test Report Tracker & Analyzer",
    description:
      "Turn blood test PDFs into plain-language biomarker explanations in 12 languages, cholesterol & HbA1c history, and multi-report trend comparisons.",
    type: "website",
    siteName: "GULA : Your Privacy Matters",
  },
  twitter: {
    card: "summary_large_image",
    title: "GULA : Your Privacy Matters — Blood Test Report Tracker & Analyzer",
    description:
      "Encrypted blood test PDF analyzer, layman biomarker guides, and multi-report health trend charts.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GULA : Your Privacy Matters",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/icons/icon-192x192.png",
  },
};

// Pinch-zoom intentionally enabled (no maximumScale=1) for full accessibility
export const viewport: Viewport = {
  themeColor: "#ec4899",
  width: "device-width",
  initialScale: 1,
};

const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('gula-theme') || localStorage.getItem('healthtrack-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Gula: Blood Test Report Tracker & Analyzer",
    alternateName: "GULA : Your Privacy Matters",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    description:
      "Gula (inspired by 'gula', meaning sugar) turns medical lab report PDFs into plain-language biomarker explanations in 12 languages, multi-report comparisons, and encrypted cloud-synced health trends.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "PDF blood test extraction and normalization",
      "Simple layman explanations for 65+ biomarkers",
      "Multi-language support across 12 languages",
      "Side-by-side blood report comparison and multi-metric overlay charts",
      "Encrypted cloud sync with per-user row-level security",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I understand a blood test report in Gula?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Upload your lab PDF or enter readings manually. Gula groups biomarkers by panel (Blood, Sugar, Lipids, Liver, Kidney, Thyroid), flags high/low/borderline values against reference ranges, and explains each test in plain everyday language across 12 languages.",
        },
      },
      {
        "@type": "Question",
        name: "Can I compare two blood test reports over time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Gula calculates changes between checkups automatically on the Home view and includes a dedicated side-by-side Report Comparison view and multi-metric overlay chart under Trends.",
        },
      },
      {
        "@type": "Question",
        name: "What does Gula mean and how is my data protected?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Gula means sugar — built to bring sweet clarity to complex HbA1c, cholesterol, liver, thyroid, kidney, and CBC reports. Guests can try up to 2 reports locally; signed-in accounts use encrypted transit/storage with Row-Level Security and zero ads or data selling.",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${karla.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <SplashScreen />
          <CapacitorBridge />
          {children}
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
