"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "./ui/Modal";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { RangeBar } from "./ui/RangeBar";
import { BiomarkerTrendChart } from "./BiomarkerTrendChart";
import { LatestResultSummary, ResultWithDate } from "@/lib/db/schema";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";
import { convertMetricUnit } from "@/lib/db/unitConversion";
import { ArrowUp, ArrowDown, Calendar, Building2, Info, ArrowLeftRight } from "lucide-react";
import { formatDate } from "@/lib/utils/date";

interface MetricDetailModalProps {
  summary: LatestResultSummary | null;
  history: ResultWithDate[];
  isOpen: boolean;
  onClose: () => void;
}

export function MetricDetailModal({
  summary,
  history,
  isOpen,
  onClose,
}: MetricDetailModalProps) {
  const [useConvertedUnit, setUseConvertedUnit] = useState(false);

  if (!summary) return null;

  const { latestResult, previousResult, changeValue, displayName, category, metricKey } =
    summary;
  const dictDef = METRIC_DICTIONARY[metricKey];

  // Determine if unit conversion is applicable (e.g. glucose or cholesterol mg/dL <-> mmol/L)
  const isConvertible =
    (metricKey.includes("glucose") || metricKey.includes("cholesterol") || metricKey === "ldl" || metricKey === "hdl" || metricKey === "triglycerides") &&
    (latestResult.unit.toLowerCase() === "mg/dl" || latestResult.unit.toLowerCase() === "mmol/l");

  const alternateUnit =
    latestResult.unit.toLowerCase() === "mg/dl" ? "mmol/L" : "mg/dL";
  const targetUnit = useConvertedUnit ? alternateUnit : latestResult.unit;

  // Converted value
  const displayValue = useMemo(() => {
    if (!useConvertedUnit || !isConvertible) return latestResult.value;
    return convertMetricUnit(metricKey, latestResult.value, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult.value, latestResult.unit, targetUnit, metricKey]);

  // Converted reference bounds
  const displayRefLow = useMemo(() => {
    if (latestResult.refLow === undefined) return undefined;
    if (!useConvertedUnit || !isConvertible) return latestResult.refLow;
    return convertMetricUnit(metricKey, latestResult.refLow, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult.refLow, latestResult.unit, targetUnit, metricKey]);

  const displayRefHigh = useMemo(() => {
    if (latestResult.refHigh === undefined) return undefined;
    if (!useConvertedUnit || !isConvertible) return latestResult.refHigh;
    return convertMetricUnit(metricKey, latestResult.refHigh, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult.refHigh, latestResult.unit, targetUnit, metricKey]);

  // Converted history for trend chart
  const chartHistory = useMemo(() => {
    if (!useConvertedUnit || !isConvertible) return history;
    return history.map((item) => ({
      ...item,
      value: convertMetricUnit(metricKey, item.value, item.unit, targetUnit).value,
      unit: targetUnit,
      refLow:
        item.refLow !== undefined
          ? convertMetricUnit(metricKey, item.refLow, item.unit, targetUnit).value
          : undefined,
      refHigh:
        item.refHigh !== undefined
          ? convertMetricUnit(metricKey, item.refHigh, item.unit, targetUnit).value
          : undefined,
    }));
  }, [history, useConvertedUnit, isConvertible, targetUnit, metricKey]);

  const statusLabel =
    latestResult.flag === "high"
      ? "High"
      : latestResult.flag === "low"
      ? "Low"
      : latestResult.flag === "borderline"
      ? "Borderline"
      : "Normal";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      description={`${category} • Latest reading`}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6 pt-2">
        {/* Top Metric Header Card */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                {category}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  {displayValue}
                </span>
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {targetUnit}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant={latestResult.flag} size="md" showDot>
                {statusLabel}
              </Badge>

              {isConvertible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseConvertedUnit(!useConvertedUnit)}
                  className="text-xs h-7 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Switch to {useConvertedUnit ? latestResult.unit : alternateUnit}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Range Visualizer Bar */}
          <div className="pt-2">
            <RangeBar
              value={displayValue}
              refLow={displayRefLow}
              refHigh={displayRefHigh}
              flag={latestResult.flag}
              unit={targetUnit}
              showLabels
            />
          </div>

          {/* Test Metadata & Change Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(latestResult.reportDate)}</span>
              </span>
              {latestResult.fileName && (
                <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{latestResult.fileName.replace(/\.pdf$/i, "")}</span>
                </span>
              )}
            </div>

            {previousResult && changeValue !== undefined && (
              <div className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
                {changeValue > 0 ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-rose-500" />
                    <span>+{Math.abs(changeValue)} vs previous</span>
                  </>
                ) : changeValue < 0 ? (
                  <>
                    <ArrowDown className="w-3 h-3 text-emerald-500" />
                    <span>-{Math.abs(changeValue)} vs previous</span>
                  </>
                ) : (
                  <span>No change vs previous</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clinical Description from Dictionary */}
        {dictDef?.description && (
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {dictDef.description}
            </p>
          </div>
        )}

        {/* Interactive Trend Chart */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Historical Trend ({chartHistory.length} {chartHistory.length === 1 ? "record" : "records"})
          </h4>
          <BiomarkerTrendChart
            history={chartHistory}
            biomarkerName={displayName}
            unit={targetUnit}
            refLow={displayRefLow}
            refHigh={displayRefHigh}
          />
        </div>

        {/* History Log Table */}
        {history.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Recorded Results
            </h4>
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatDate(record.reportDate)}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px] sm:max-w-[200px]">
                      {record.fileName.replace(/\.pdf$/i, "")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {useConvertedUnit && isConvertible
                        ? convertMetricUnit(metricKey, record.value, record.unit, targetUnit).value
                        : record.value}{" "}
                      {targetUnit}
                    </span>
                    <Badge variant={record.flag} size="sm">
                      {record.flag}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
