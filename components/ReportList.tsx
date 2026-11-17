"use client";

import React, { useState } from "react";
import { Report, Result } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { Trash2, Calendar, Building2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Badge } from "./ui/Badge";

interface ReportListProps {
  reports: Report[];
  onReportDeleted: () => void;
  onOpenUpload: () => void;
}

export function ReportList({ reports, onReportDeleted, onOpenUpload }: ReportListProps) {
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
  const [reportResults, setReportResults] = useState<Record<number, Result[]>>({});
  const [loadingReportId, setLoadingReportId] = useState<number | null>(null);

  const toggleExpand = async (reportId: number) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      return;
    }

    setExpandedReportId(reportId);
    if (!reportResults[reportId]) {
      setLoadingReportId(reportId);
      const results = await db.results.where("reportId").equals(reportId).toArray();
      setReportResults((prev) => ({ ...prev, [reportId]: results }));
      setLoadingReportId(null);
    }
  };

  const handleDelete = async (reportId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this report from your device?")) {
      await db.transaction("rw", db.reports, db.results, async () => {
        await db.results.where("reportId").equals(reportId).delete();
        await db.reports.delete(reportId);
      });
      onReportDeleted();
    }
  };

  if (!reports || reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <FileText className="w-10 h-10 text-[var(--text-muted)] mb-3" />
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--text-primary)]">No reports yet</h3>
        <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-4 max-w-sm">
          Upload a health test report PDF or add an entry manually to begin tracking your health over time.
        </p>
        <button
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] text-[13px] font-medium transition-colors tap-target cursor-pointer"
        >
          Upload first report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const isExpanded = expandedReportId === report.id;
        const results = report.id ? reportResults[report.id] || [] : [];

        return (
          <div
            key={report.id}
            className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden transition-[border-color] duration-[120ms] hover:border-[var(--border-strong)]"
          >
            <div
              onClick={() => report.id && toggleExpand(report.id)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer tap-target"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[14px] font-medium text-[var(--text-primary)]">
                    {report.fileName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-muted)] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(report.reportDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {report.labName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {report.labName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--border-subtle)]">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => report.id && handleDelete(report.id, e)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--status-abnormal-text)] hover:bg-[var(--status-abnormal-bg)] transition-colors tap-target cursor-pointer"
                    aria-label="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Results List */}
            {isExpanded && (
              <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
                <span className="text-[12px] font-medium text-[var(--text-muted)] block mb-3">
                  Recorded results ({results.length})
                </span>
                {loadingReportId === report.id ? (
                  <p className="text-[12px] text-[var(--text-muted)]">Loading details...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {results.map((r) => (
                      <div
                        key={r.id || r.displayName}
                        className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-[var(--text-primary)] line-clamp-1">
                            {r.displayName}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                            {r.value} {r.unit}
                          </p>
                        </div>
                        <Badge variant={r.flag} size="sm">
                          {r.flag === "high" ? "High" : r.flag === "low" ? "Low" : r.flag === "borderline" ? "Borderline" : "Normal"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
