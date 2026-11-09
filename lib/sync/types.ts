import { ReportStatus, ResultFlag, MetricCategory } from "../db/schema";

export type SyncStatus = "synced" | "syncing" | "offline" | "error" | "unconfigured";

export interface AuthUser {
  id: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CloudReport {
  id: string; // UUID in cloud
  user_id: string;
  file_name: string;
  lab_name: string | null;
  report_date: string;
  uploaded_at: number;
  status: ReportStatus;
  pdf_storage_path: string | null;
  parse_warnings: string[];
  created_at: string;
  updated_at: string;
}

export interface CloudResult {
  id: string; // UUID in cloud
  report_id: string; // Foreign key referencing CloudReport.id
  user_id: string;
  metric_key: string;
  display_name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  flag: ResultFlag;
  category: MetricCategory;
  created_at: string;
  updated_at: string;
}

export type MergeChoice = "merge" | "fresh";
