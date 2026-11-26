"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Modal } from "./ui/Modal";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { RangeBar } from "./ui/RangeBar";
import { BiomarkerTrendChart } from "./BiomarkerTrendChart";
import { LatestResultSummary, ResultWithDate } from "@/lib/db/schema";
import { convertMetricUnit } from "@/lib/db/unitConversion";
import { useTranslation, getLocalizedFlagLabel, getLocalizedPanelName } from "@/lib/i18n/translations";
import { getLocalizedMetricName, getLocalizedMetricExplanation } from "@/lib/i18n/metricTranslations";
import { ArrowUp, ArrowDown, Calendar, Building2, Info, ArrowLeftRight } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

interface MetricDetailModalProps {
  summary: LatestResultSummary | null;
  history: ResultWithDate[];
  isLatestReport?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function MetricDetailModal({
  summary,
  history,
  isLatestReport = true,
  isOpen,
  onClose,
}: MetricDetailModalProps) {
  const { t, language } = useTranslation();
  const [useConvertedUnit, setUseConvertedUnit] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const latestResult = summary?.latestResult;
  const previousResult = summary?.previousResult;
  const changeValue = summary?.changeValue;
  const comparisonRelation = summary?.comparisonRelation || "since";
  const rawDisplayName = summary?.displayName || "";
  const category = summary?.category || "Other";
  const metricKey = summary?.metricKey || "";

  const displayName = useMemo(
    () => getLocalizedMetricName(metricKey, rawDisplayName, language),
    [metricKey, rawDisplayName, language]
  );

  const categoryLabel = useMemo(
    () => (language === "en" ? category : getLocalizedPanelName(category, language)),
    [category, language]
  );

  const laymanExplanation = useMemo(
    () => getLocalizedMetricExplanation(metricKey, rawDisplayName, category, language),
    [metricKey, rawDisplayName, category, language]
  );

  // Reset toggles whenever a different marker or report opens
  useEffect(() => {
    setUseConvertedUnit(false);
    setIsDescExpanded(false);
  }, [metricKey, latestResult?.reportId, isOpen]);

  // Measure if explanation wraps past 1 line
  useEffect(() => {
    const el = descRef.current;
    if (!el || isDescExpanded) return;
    const checkOverflow = () => {
      const overflowing = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2;
      setIsOverflowing(overflowing);
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [laymanExplanation, isOpen, isDescExpanded]);

  const isConvertible = Boolean(
    latestResult &&
      (metricKey.includes("glucose") ||
        metricKey.includes("cholesterol") ||
        metricKey === "ldl" ||
        metricKey === "hdl" ||
        metricKey === "triglycerides") &&
      (latestResult.unit.toLowerCase() === "mg/dl" ||
        latestResult.unit.toLowerCase() === "mmol/l")
  );

  const alternateUnit =
    latestResult?.unit.toLowerCase() === "mg/dl" ? "mmol/L" : "mg/dL";
  const targetUnit = useConvertedUnit ? alternateUnit : (latestResult?.unit || "");

  const displayValue = useMemo(() => {
    if (!latestResult) return 0;
    if (!useConvertedUnit || !isConvertible) return latestResult.value;
    return convertMetricUnit(metricKey, latestResult.value, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult?.value, latestResult?.unit, targetUnit, metricKey]);

  const displayRefLow = useMemo(() => {
    if (!latestResult || latestResult.refLow === undefined) return undefined;
    if (!useConvertedUnit || !isConvertible) return latestResult.refLow;
    return convertMetricUnit(metricKey, latestResult.refLow, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult?.refLow, latestResult?.unit, targetUnit, metricKey]);

  const displayRefHigh = useMemo(() => {
    if (!latestResult || latestResult.refHigh === undefined) return undefined;
    if (!useConvertedUnit || !isConvertible) return latestResult.refHigh;
    return convertMetricUnit(metricKey, latestResult.refHigh, latestResult.unit, targetUnit).value;
  }, [useConvertedUnit, isConvertible, latestResult?.refHigh, latestResult?.unit, targetUnit, metricKey]);

  const displayChangeValue = useMemo(() => {
    if (changeValue === undefined || !previousResult || !latestResult) return undefined;
    if (!useConvertedUnit || !isConvertible) return changeValue;
    const prevConverted = convertMetricUnit(metricKey, previousResult.value, previousResult.unit, targetUnit).value;
    return Number((displayValue - prevConverted).toFixed(2));
  }, [changeValue, previousResult, latestResult, useConvertedUnit, isConvertible, metricKey, targetUnit, displayValue]);

  const chartHistory = useMemo(() => {
    if (!history) return [];
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

  if (!summary || !latestResult) return null;

  const statusLabel = getLocalizedFlagLabel(latestResult.flag, language);

  const modalSubtitle = isLatestReport
    ? `${categoryLabel} • ${t.latestReading}`
    : `${categoryLabel} • ${formatDate(latestResult.reportDate)} ${t.reportSuffix}`;

  const comparisonDateText = previousResult?.reportDate
    ? `${comparisonRelation === "vs" ? t.vs : t.since} ${formatDate(previousResult.reportDate)}`
    : t.vsPrevious;

  // Show "Read more" if DOM overflows OR text exceeds ~55 chars (ensures consistency across desktop/mobile & JSDOM)
  const needsReadMore = isOverflowing || laymanExplanation.length > 55;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      description={modalSubtitle}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-5 pt-1">
        {/* Top Metric Header Card — dynamic for selected report date */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[12px] font-medium text-[var(--text-muted)] block mb-1">
                {categoryLabel}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] tabular-nums">
                  {displayValue}
                </span>
                <span className="text-[13px] font-medium text-[var(--text-muted)]">
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
                  <span>{t.switchTo} {useConvertedUnit ? latestResult.unit : alternateUnit}</span>
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

          {/* Test Metadata & Dynamic Change Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-muted)]">
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

            {previousResult && displayChangeValue !== undefined && (
              <div className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] tabular-nums">
                {displayChangeValue > 0 ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-[var(--status-abnormal-dot)]" />
                    <span>+{Math.abs(displayChangeValue)} {comparisonDateText}</span>
                  </>
                ) : displayChangeValue < 0 ? (
                  <>
                    <ArrowDown className="w-3 h-3 text-[var(--status-normal-dot)]" />
                    <span>-{Math.abs(displayChangeValue)} {comparisonDateText}</span>
                  </>
                ) : (
                  <span>{t.noChange} {comparisonDateText}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Layman-Friendly Explainer Info Row with Light Yellow Fading Gradient & Read More */}
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-xl border flex gap-2.5 text-[12px]",
            isDescExpanded ? "items-start" : "items-center",
            "bg-gradient-to-r from-amber-50/95 via-amber-50/50 to-transparent",
            "dark:from-amber-400/[0.11] dark:via-amber-400/[0.04] dark:to-transparent",
            "border-amber-200/75 dark:border-amber-400/20"
          )}
        >
          <Info
            className={cn(
              "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0",
              isDescExpanded && "mt-0.5"
            )}
          />
          <p
            ref={descRef}
            className={cn(
              "flex-1 min-w-0 text-[var(--text-secondary)] leading-relaxed",
              !isDescExpanded && "line-clamp-1"
            )}
          >
            {laymanExplanation}
          </p>
          {needsReadMore && (
            <button
              type="button"
              onClick={() => setIsDescExpanded((prev) => !prev)}
              className="shrink-0 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer select-none whitespace-nowrap"
            >
              {isDescExpanded ? t.showLess : t.readMore}
            </button>
          )}
        </div>

        {/* Interactive Trend Chart — full longitudinal view, consistent across every dated report */}
        <div>
          <h4 className="text-[12px] font-medium text-[var(--text-muted)] mb-2.5">
            {t.historicalTrend} ({chartHistory.length} {chartHistory.length === 1 ? t.recordSingular : t.recordPlural})
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
            <h4 className="text-[12px] font-medium text-[var(--text-muted)]">
              {t.recordedResults}
            </h4>
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
              {history.map((record) => {
                const recStatusLabel = getLocalizedFlagLabel(record.flag, language);
                const isSelectedRow =
                  !isLatestReport &&
                  record.reportId === latestResult.reportId &&
                  record.reportDate === latestResult.reportDate;

                return (
                  <div
                    key={record.id ?? `${record.reportId}-${record.reportDate}`}
                    className={cn(
                      "px-3.5 py-2.5 flex items-center justify-between text-[12px]",
                      isSelectedRow && "bg-[var(--accent-subtle)]"
                    )}
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
                      <span className="font-medium text-[var(--text-primary)] tabular-nums">
                        {useConvertedUnit && isConvertible
                          ? convertMetricUnit(metricKey, record.value, record.unit, targetUnit).value
                          : record.value}{" "}
                        {targetUnit}
                      </span>
                      <Badge variant={record.flag} size="sm">
                        {recStatusLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t.done}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
