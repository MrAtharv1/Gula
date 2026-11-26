"use client";

import React from "react";
import { LatestResultSummary } from "@/lib/db/schema";
import { Badge } from "./ui/Badge";
import { Sparkline } from "./ui/Sparkline";
import { RangeBar } from "./ui/RangeBar";
import { useTranslation, getLocalizedFlagLabel } from "@/lib/i18n/translations";
import { getLocalizedMetricName } from "@/lib/i18n/metricTranslations";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

interface BiomarkerCardProps {
  summary: LatestResultSummary;
  isSelected?: boolean;
  hideSinglePointTrend?: boolean;
  onClick: () => void;
  className?: string;
}

const FULL_CARD_NAME_MAP: Record<string, string> = {
  // Complete Blood Count & Hematology
  "Red Blood Cell Count": "Red Blood Cell Count (RBC)",
  "White Blood Cell Count": "White Blood Cell Count (WBC)",
  "Platelet Count": "Platelet Count (PLT)",
  "Hematocrit": "Hematocrit (HCT)",
  "Hematocrit (PCV)": "Hematocrit (PCV / HCT)",
  "RDW (CV)": "Red Cell Distribution Width - CV (RDW-CV)",
  "RDW-SD": "Red Cell Distribution Width - SD (RDW-SD)",
  "ESR - Erythrocyte Sedimentation Rate": "Erythrocyte Sedimentation Rate (ESR)",

  // Lipid Panel
  "LDL Cholesterol": "Low-Density Lipoprotein Cholesterol (LDL)",
  "HDL Cholesterol": "High-Density Lipoprotein Cholesterol (HDL)",
  "VLDL Cholesterol": "Very Low-Density Lipoprotein Cholesterol (VLDL)",
  "V.L.D.L Cholesterol": "Very Low-Density Lipoprotein Cholesterol (VLDL)",
  "Non-HDL Cholesterol": "Non-High-Density Lipoprotein Cholesterol (Non-HDL)",
  "Non HDL Cholesterol": "Non-High-Density Lipoprotein Cholesterol (Non-HDL)",
  "Total Cholesterol / HDL Ratio": "Total Cholesterol / High-Density Lipoprotein Ratio (TC/HDL)",
  "Chol/HDL Ratio": "Total Cholesterol / High-Density Lipoprotein Ratio (TC/HDL)",
  "HDL/ LDL Ratio": "High-Density / Low-Density Lipoprotein Ratio (HDL/LDL)",
  "LDL/HDL Ratio": "Low-Density / High-Density Lipoprotein Ratio (LDL/HDL)",

  // Sugar & Metabolic
  "HOMA-IR": "Homeostatic Model Assessment of Insulin Resistance (HOMA-IR)",
  "HOMA-IR (Insulin Resistance)": "Homeostatic Model Assessment of Insulin Resistance (HOMA-IR)",
  "HbA1c": "Hemoglobin A1c (HbA1c)",

  // Thyroid
  "Total T3": "Total Triiodothyronine (T3)",
  "Total T4": "Total Thyroxine (T4)",
  "Free T3": "Free Triiodothyronine (Free T3)",
  "Free T4": "Free Thyroxine (Free T4)",
  "Thyroid Stimulating Hormone (Ultrasensitive)": "Thyroid Stimulating Hormone (TSH)",

  // Liver
  "SGOT / AST": "Aspartate Aminotransferase (AST / SGOT)",
  "SGPT / ALT": "Alanine Aminotransferase (ALT / SGPT)",
  "SGOT / SGPT Ratio": "Aspartate / Alanine Aminotransferase Ratio (SGOT/SGPT)",
  "A/G Ratio": "Albumin / Globulin Ratio (A/G)",

  // Kidney & Electrolytes
  "BUN (Blood Urea Nitrogen)": "Blood Urea Nitrogen (BUN)",
  "Estimated GFR (eGFR)": "Estimated Glomerular Filtration Rate (eGFR)",
  "eGFR (CKD-EPI)": "Estimated Glomerular Filtration Rate (eGFR)",
  "BUN / Creatinine Ratio": "Blood Urea Nitrogen / Creatinine Ratio (BUN/Creatinine)",

  // Hormones
  "DHEA-Sulfate": "Dehydroepiandrosterone Sulfate (DHEA-S)",
};

export function getFullCardName(displayName: string): string {
  return FULL_CARD_NAME_MAP[displayName] || displayName;
}

const SHORT_NAME_MAP: Record<string, string> = {
  "White Blood Cell Count": "WBC",
  "Red Blood Cell Count": "RBC",
  "Platelet Count": "Platelets",
  "Total Cholesterol": "Total Chol",
  "LDL Cholesterol": "LDL",
  "HDL Cholesterol": "HDL",
  "VLDL Cholesterol": "VLDL",
  "Non-HDL Cholesterol": "Non-HDL",
  "Fasting Blood Glucose": "Fasting Glucose",
  "Random Blood Glucose": "Random Glucose",
  "Total Cholesterol / HDL Ratio": "TC / HDL",
};

export function getShortName(displayName: string): string {
  if (SHORT_NAME_MAP[displayName]) return SHORT_NAME_MAP[displayName];
  const match = displayName.match(/\(([^)]{2,8})\)$/);
  if (match) return match[1];
  return displayName;
}

export const BiomarkerCard = React.memo(function BiomarkerCard({
  summary,
  isSelected,
  hideSinglePointTrend = false,
  onClick,
  className,
}: BiomarkerCardProps) {
  const { t, language } = useTranslation();
  const {
    metricKey,
    latestResult,
    previousResult,
    changeValue,
    comparisonRelation,
    displayName,
    sparklineValues = [],
  } = summary;

  const localizedFullName = getLocalizedMetricName(metricKey, displayName, language);
  const fullEnglishName = getFullCardName(displayName);
  const cardTitleName =
    language === "en" ? fullEnglishName : localizedFullName;
  const isAbnormal = latestResult.flag !== "normal";
  const isBorderline = latestResult.flag === "borderline";
  const relationWord = comparisonRelation === "vs" ? t.vs : t.since;

  const hasMultiPointTrend = sparklineValues.length > 1 || Boolean(previousResult);
  const shouldShowSparkline = hideSinglePointTrend ? hasMultiPointTrend : true;

  const renderDelta = () => {
    if (!previousResult || changeValue === undefined) {
      return (
        <span className="text-[11.5px] text-[var(--text-faint)] tracking-tight">
          {t.firstRecord}
        </span>
      );
    }

    const prevDate = previousResult.reportDate
      ? formatDate(previousResult.reportDate)
      : "last report";

    if (changeValue === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-faint)] tracking-tight">
          <Minus className="w-3 h-3 shrink-0" />
          <span>
            {t.noChange}
            {previousResult.reportDate && (
              <span className="ml-1">{relationWord} {prevDate}</span>
            )}
          </span>
        </span>
      );
    }

    const absChange = Math.abs(changeValue);
    const direction = changeValue > 0 ? t.up : t.down;
    const ArrowIcon = changeValue > 0 ? ArrowUp : ArrowDown;

    const deltaColorClass = isAbnormal
      ? isBorderline
        ? "text-[var(--status-borderline-text)]"
        : "text-[var(--status-abnormal-text)]"
      : "text-[var(--text-faint)]";

    return (
      <span className={cn("inline-flex items-center gap-1 text-[11.5px] tabular-nums tracking-tight", deltaColorClass)}>
        <ArrowIcon className={cn("w-2.5 h-2.5 shrink-0", deltaColorClass)} />
        <span>
          {direction} {absChange}
          <span className="text-[var(--text-faint)] ml-1">{relationWord} {prevDate}</span>
        </span>
      </span>
    );
  };

  const statusLabel = getLocalizedFlagLabel(latestResult.flag, language);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      title={cardTitleName}
      className={cn(
        "group relative p-4 rounded-xl cursor-pointer text-left select-none",
        "h-full flex flex-col justify-between gap-3",
        "bg-[var(--bg-card)] home-glass-card border",
        "transition-all duration-[150ms] ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        isSelected
          ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent-muted),var(--shadow-sm)]"
          : [
              "border-[var(--border-subtle)] shadow-[var(--shadow-sm)]",
              "hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)]",
              "hover:-translate-y-px",
            ],
        className
      )}
      aria-label={`${cardTitleName}, ${latestResult.valueText || latestResult.value} ${latestResult.unit}, ${statusLabel}`}
    >
      {/* Row 1: Name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--text-secondary)] leading-tight tracking-tight">
          {cardTitleName}
        </span>
        {isAbnormal && (
          <Badge variant={latestResult.flag} size="sm" showDot>
            {statusLabel}
          </Badge>
        )}
      </div>

      {/* Row 2: Value + unit + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1 tabular-nums">
          <span
            className={cn(
              "font-semibold leading-none tracking-tight text-[var(--text-primary)] tabular-nums",
              latestResult.valueText ? "text-[18px]" : "text-[26px]"
            )}
          >
            {latestResult.valueText || latestResult.value}
          </span>
          <span className="text-[11.5px] text-[var(--text-faint)] font-normal ml-0.5">
            {latestResult.unit}
          </span>
        </div>

        {shouldShowSparkline && (
          <Sparkline
            values={sparklineValues.length > 0 ? sparklineValues : [latestResult.value]}
            flag={latestResult.flag}
            width={56}
            height={22}
          />
        )}
      </div>

      {/* Row 3: Dynamic Delta */}
      <div className="flex items-center">
        {renderDelta()}
      </div>

      {/* Row 4: Range bar */}
      <RangeBar
        value={latestResult.value}
        refLow={latestResult.refLow}
        refHigh={latestResult.refHigh}
        flag={latestResult.flag}
        unit={latestResult.unit}
        showLabels
      />
    </div>
  );
});
