export type MetricCategory =
  | "Blood"
  | "Lipids"
  | "Sugar"
  | "Thyroid"
  | "Liver"
  | "Kidney"
  | "Vitamins"
  | "Hormones"
  | "Other";

export type ResultFlag = "normal" | "low" | "high" | "borderline";
export type ReportStatus = "active" | "undone";

export interface Report {
  id?: number;
  fileName: string;
  labName?: string;
  reportDate: string; // Date of the test (YYYY-MM-DD), not upload date
  uploadedAt: number; // Unix timestamp
  status: ReportStatus; // "active" | "undone"
  fileBlob?: Blob; // Stores original PDF in IndexedDB
  parseWarnings: string[];
  // Phase 8 Sync extensions
  cloudId?: string;
  userId?: string;
  pdfStoragePath?: string;
  pdfSynced?: boolean;
  syncedAt?: number;
  updatedAt?: number;
}

export interface Result {
  id?: number;
  reportId: number;
  metricKey: string; // Canonical normalized key (e.g. "hemoglobin", "glucose_fasting")
  displayName: string; // As printed on report
  value: number;
  unit: string;
  refLow?: number;
  refHigh?: number;
  flag: ResultFlag;
  category: MetricCategory;
  // Phase 8 Sync extensions
  cloudId?: string;
  reportCloudId?: string;
  userId?: string;
  updatedAt?: number;
}

export interface SyncQueueItem {
  id?: number;
  entityType: "report" | "result" | "status" | "pdf";
  entityId: number;
  action: "upsert" | "delete" | "status_change";
  createdAt: number;
  retryCount: number;
  error?: string;
}

export interface MetricDefinition {
  canonicalKey: string;
  displayName: string;
  category: MetricCategory;
  standardUnit: string;
  defaultLow?: number;
  defaultHigh?: number;
  description: string;
  aliases: string[];
}

export interface ResultWithDate extends Result {
  reportDate: string;
  fileName: string;
}

export interface LatestResultSummary {
  metricKey: string;
  displayName: string;
  category: MetricCategory;
  standardUnit: string;
  latestResult: ResultWithDate;
  previousResult?: ResultWithDate;
  changeValue?: number;
  changePercent?: number;
  historyCount: number;
  sparklineValues?: number[];
  history?: ResultWithDate[];
}

// Backward-compatible aliases for parser layer
export type HealthStatus = "normal" | "borderline" | "abnormal";
export type BiomarkerFlag = ResultFlag;
export type BiomarkerCategory =
  | MetricCategory
  | "Metabolic"
  | "Lipid Panel"
  | "Complete Blood Count"
  | "Liver Function"
  | "Kidney Function"
  | "Vitamins & Minerals"
  | "Electrolytes"
  | "Inflammation";

export interface BiomarkerDefinition {
  canonicalKey: string;
  displayName: string;
  category: BiomarkerCategory;
  standardUnit: string;
  defaultLow?: number;
  defaultHigh?: number;
  description: string;
  aliases: string[];
}
