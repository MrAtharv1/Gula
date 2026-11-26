import { MetricCategory, ResultFlag } from "@/lib/db/schema";

export interface ParsedResultItem {
  id: string; // unique client id for preview/editing
  metricKey: string;
  canonicalKey?: string; // compatibility alias for metricKey
  name?: string; // compatibility alias for displayName
  displayName: string;
  value: number;
  valueText?: string;
  modifier?: "<" | ">";
  unit: string;
  refLow?: number;
  refHigh?: number;
  rawRange?: string;
  printedFlag?: string;
  flag: ResultFlag;
  status?: ResultFlag | "abnormal"; // compatibility alias for flag
  category: MetricCategory;
  confidence: number; // 0.0 to 1.0
  selected: boolean;
  source?: "detail" | "summary";
  method?: string;
  section?: string;
}

export interface ParserOutput {
  reportDate: string | null;
  date?: string; // compatibility alias for reportDate
  labName: string;
  patientName?: string;
  results: ParsedResultItem[];
  biomarkers?: ParsedResultItem[]; // compatibility alias for results
  skippedLines: string[];
  confidence: number; // 0.0 to 1.0 overall report confidence
  errors: string[];
  warnings?: string[]; // compatibility alias for errors
  rawText: string;
  totalPages: number;
  pages_used?: number[];
  pages_skipped?: { pageNumber: number; reason: string }[];
}

// Backward-compatible alias for existing UI components
export type ParsedBiomarker = ParsedResultItem;
export type ParsedReportResult = ParserOutput;
