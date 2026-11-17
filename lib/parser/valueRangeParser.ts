/**
 * Pure, deterministic Value, Unit, Range, and Flag parsing engine for laboratory results.
 *
 * Capabilities:
 * - Values: Numeric, glued flags (L*, H*, CL*, CH*), qualitative results (Negative, Present, Pale yellow), count ranges (4-6 /hpf).
 * - Units: Canonical normalization (µL/uL, 10^3/µL, 10^9/L, mL/min/1.73m², '-' -> null).
 * - Ranges: Two-sided ('13.0 - 17.0', '50 – 116'), one-sided ('< 45', '>= 90', no invented 0), multi-tier normal extraction ('Desirable : < 200'), expectedText ('Negative', 'Clear').
 * - Flag decision: TRUST printed lab flags (L/H/CL/CH). Compute flag when no lab flag. Complex/missing range -> 'no_range' (never Normal). Warn on conflict.
 */

export type ParsedFlag =
  | "normal"
  | "low"
  | "high"
  | "borderline"
  | "critical_low"
  | "critical_high"
  | "abnormal"
  | "no_range";

export interface ParsedValue {
  value: number | null;
  valueText: string;
  modifier?: "<" | ">";
  isQualitative: boolean;
  printedFlag?: string;
  flagFromValue?: ParsedFlag;
}

export interface ParsedRange {
  low?: number;
  high?: number;
  modifier?: "<" | "<=" | ">" | ">=";
  expectedText?: string;
  isMultiTier: boolean;
  rawRange: string;
  hasRange: boolean;
}

export interface ParsedFieldResult {
  value: number | null;
  valueText: string;
  modifier?: "<" | ">";
  unit: string | null;
  refLow?: number;
  refHigh?: number;
  expectedText?: string;
  rawRange: string;
  printedFlag?: string;
  flag: ParsedFlag;
  warning?: string;
}

const QUALITATIVE_REGEX =
  /^(?:negative|positive(?:\([+\d]+\))?|slightly hazy|hazy|cloudy|turbid|present|absent|normal|pale yellow|straw yellow|yellow|amber|trace|nil|clear|not detected|detected|reactive|non-reactive|adequate|inadequate)\b/i;

const COUNT_RANGE_REGEX = /^\s*(\d+\s*-\s*\d+)\s*(?:\/hpf|\/lpf|\/field)?\s*$/i;

/**
 * Parses raw value cell string into numeric/qualitative value and glued flags.
 */
export function parseValueCell(rawCell: string, unitHint?: string): ParsedValue {
  const trimmed = rawCell.trim();
  if (!trimmed) {
    return { value: null, valueText: "", isQualitative: false };
  }

  // 1. Detect and strip glued flags: L*, H*, CL*, CH*, L, H, CL, CH
  let cleaned = trimmed;
  let printedFlag: string | undefined;
  let flagFromValue: ParsedFlag | undefined;

  // Pattern: trailing flag like "8.9 L*", "16.3 H*", "2.4 CL*", "4-6 H*", "100 L"
  const gluedFlagMatch = cleaned.match(
    /\s+(CL\*|CH\*|L\*|H\*|CL|CH|CRITICAL\s*LOW|CRITICAL\s*HIGH|CRITICAL|HIGH|LOW|[LH*])\s*$/i
  );

  if (gluedFlagMatch) {
    printedFlag = gluedFlagMatch[1].toUpperCase();
    cleaned = cleaned.slice(0, gluedFlagMatch.index).trim();

    if (printedFlag.includes("CL") || printedFlag.includes("CRITICAL LOW")) {
      flagFromValue = "critical_low";
    } else if (printedFlag.includes("CH") || printedFlag.includes("CRITICAL HIGH")) {
      flagFromValue = "critical_high";
    } else if (printedFlag.startsWith("L") || printedFlag === "LOW") {
      flagFromValue = "low";
    } else if (printedFlag.startsWith("H") || printedFlag === "HIGH" || printedFlag === "*") {
      flagFromValue = "high";
    }
  }

  // 2. Count ranges as qualitative values (e.g. "4-6 /hpf", "1-2" in urine microscopy)
  const isCountRange =
    COUNT_RANGE_REGEX.test(cleaned) ||
    ((unitHint?.toLowerCase().includes("hpf") || unitHint?.toLowerCase().includes("lpf")) &&
      /^\d+\s*-\s*\d+$/.test(cleaned));

  if (isCountRange) {
    const match = cleaned.match(/^(\d+\s*-\s*\d+)/);
    const rangeVal = match ? match[1].replace(/\s+/g, "") : cleaned;
    return {
      value: null,
      valueText: rangeVal,
      isQualitative: true,
      printedFlag,
      flagFromValue,
    };
  }

  // 3. Qualitative terms (e.g. "Negative", "Pale yellow", "Present", "Trace")
  if (QUALITATIVE_REGEX.test(cleaned)) {
    return {
      value: null,
      valueText: cleaned,
      isQualitative: true,
      printedFlag,
      flagFromValue,
    };
  }

  // 4. Standard numeric values with optional prefix modifier (<, >)
  const numMatch = cleaned.match(/^([<>]?)\s*(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const rawModifier = numMatch[1] === "<" || numMatch[1] === ">" ? (numMatch[1] as "<" | ">") : undefined;
    const num = parseFloat(numMatch[2]);
    return {
      value: isNaN(num) ? null : num,
      valueText: numMatch[2],
      modifier: rawModifier,
      isQualitative: false,
      printedFlag,
      flagFromValue,
    };
  }

  // Fallback for custom qualitative text (e.g. descriptive lab comments)
  return {
    value: null,
    valueText: cleaned,
    isQualitative: true,
    printedFlag,
    flagFromValue,
  };
}

/**
 * Normalizes units to canonical standards and treats '-' as null.
 */
export function normalizeUnit(rawUnit: string | null | undefined): string | null {
  if (!rawUnit) return null;
  const trimmed = rawUnit.trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "nil") {
    return null;
  }

  // Replace micro symbols µ / μ with standard micro µ
  let u = trimmed.replace(/[µμ]/g, "µ");

  // Common unit normalizations
  if (/^10\^?3\s*\/\s*(?:µl|ul)/i.test(u)) return "10^3/µL";
  if (/^10\^?6\s*\/\s*(?:µl|ul)/i.test(u)) return "10^6/µL";
  if (/^10\^?9\s*\/\s*l/i.test(u)) return "10^9/L";
  if (/^(?:µl|ul|μl)$/i.test(u)) return "µL";
  if (/^ml\/min\/1\.73\s*(?:sq\s*m|m2)/i.test(u)) return "mL/min/1.73m²";
  if (/^mg\/dl$/i.test(u)) return "mg/dL";
  if (/^g\/dl$/i.test(u)) return "g/dL";
  if (/^ng\/dl$/i.test(u)) return "ng/dL";
  if (/^pg\/ml$/i.test(u)) return "pg/mL";
  if (/^uiu\/ml|µiu\/ml|miu\/l/i.test(u)) return "µIU/mL";
  if (/^mmol\/l$/i.test(u)) return "mmol/L";
  if (/^umol\/l|µmol\/l$/i.test(u)) return "µmol/L";
  if (/^fl$/i.test(u)) return "fL";
  if (/^pg$/i.test(u)) return "pg";
  if (/^%$/i.test(u)) return "%";
  if (/^\/hpf$/i.test(u)) return "/hpf";

  return u;
}

/**
 * Parses reference ranges into bounds, one-sided thresholds, or expected qualitative text.
 */
export function parseRangeCell(rawRange: string | null | undefined): ParsedRange {
  if (!rawRange) {
    return { rawRange: "", isMultiTier: false, hasRange: false };
  }

  const trimmed = rawRange.trim();
  if (
    !trimmed ||
    trimmed === "-" ||
    /^(?:refer table below|refer to text|as per clinical correlation|see interpretation)$/i.test(
      trimmed
    )
  ) {
    return { rawRange: trimmed, isMultiTier: false, hasRange: false };
  }

  // 1. Expected-value qualitative ranges (e.g. "Negative", "Absent", "Clear", "Pale yellow")
  if (QUALITATIVE_REGEX.test(trimmed) && !/\d/.test(trimmed)) {
    return {
      expectedText: trimmed,
      rawRange: trimmed,
      isMultiTier: false,
      hasRange: true,
    };
  }

  // 2. Multi-tier ranges (extract the desirable/normal tier, ignore the other tiers)
  // E.g. "Desirable : < 200 / Borderline high: 200 - 239 / High risk: > 240"
  // E.g. "Normal Or High: >= 90 / Mild Or Decrease: 60-89 / Moderate: 30-59"
  // E.g. "Optimal: < 100 / Above optimal: 100-129 / ..."
  const isMultiTier = /(?:\/|;|–|—|\n).*(?:borderline|high risk|moderate|severe|mild|optimal|desirable)/i.test(
    trimmed
  );

  if (isMultiTier) {
    // Search for desirable / optimal / normal tier segment
    const normalTierMatch = trimmed.match(
      /(?:desirable|optimal|normal(?:\s*or\s*high)?)\s*[:=-]?\s*([<>]?={0,1}\s*\d+(?:\.\d+)?(?:\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?)?)/i
    );

    if (normalTierMatch && normalTierMatch[1]) {
      const parsedTier = parseSimpleRangeString(normalTierMatch[1]);
      return {
        ...parsedTier,
        isMultiTier: true,
        rawRange: trimmed,
        hasRange: parsedTier.low !== undefined || parsedTier.high !== undefined,
      };
    }
  }

  // 3. Simple two-sided or one-sided range
  const parsed = parseSimpleRangeString(trimmed);
  return {
    ...parsed,
    isMultiTier,
    rawRange: trimmed,
    hasRange: parsed.low !== undefined || parsed.high !== undefined,
  };
}

/**
 * Parses simple numeric interval strings like "13.0 - 17.0", "50 – 116", "< 45", ">= 90".
 */
function parseSimpleRangeString(
  str: string
): { low?: number; high?: number; modifier?: "<" | "<=" | ">" | ">=" } {
  const s = str.trim();

  // One-sided less-than: "<= 5", "< 45", "<1.00" (do NOT invent 0 lower bound)
  const lessMatch = s.match(/^(?:<=|<)\s*(\d+(?:\.\d+)?)/);
  if (lessMatch) {
    return {
      high: parseFloat(lessMatch[1]),
      modifier: s.startsWith("<=") ? "<=" : "<",
    };
  }

  // One-sided greater-than: ">= 90", "> 40"
  const greaterMatch = s.match(/^(?:>=|>)\s*(\d+(?:\.\d+)?)/);
  if (greaterMatch) {
    return {
      low: parseFloat(greaterMatch[1]),
      modifier: s.startsWith(">=") ? ">=" : ">",
    };
  }

  // Two-sided intervals: "13.0 - 17.0", "0.02-0.1", "50 – 116", "25.68- 42.8"
  const intervalMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  if (intervalMatch) {
    const low = parseFloat(intervalMatch[1]);
    const high = parseFloat(intervalMatch[2]);
    if (!isNaN(low) && !isNaN(high)) {
      return { low, high };
    }
  }

  return {};
}

/**
 * Determines final clinical flag:
 * 1. If lab printed flag exists (L/H/CL/CH): TRUST it.
 * 2. If no lab flag: compute from numeric bounds or expected qualitative text.
 * 3. If range is complex or missing and no lab flag: 'no_range' (never Normal).
 * 4. If lab flag and computed flag disagree: keep lab flag and attach parse warning.
 */
export function resolveFlag(
  value: ParsedValue,
  range: ParsedRange,
  testName?: string
): { flag: ParsedFlag; warning?: string } {
  const labFlag = value.flagFromValue;

  // Compute what numeric bounds would say (if available)
  let computedFlag: ParsedFlag | undefined;

  if (value.value !== null && typeof value.value === "number") {
    if (range.low !== undefined && range.high !== undefined) {
      if (value.value < range.low) {
        computedFlag = "low";
      } else if (value.value > range.high) {
        computedFlag = "high";
      } else {
        computedFlag = "normal";
      }
    } else if (range.high !== undefined && range.low === undefined) {
      if (value.value > range.high) {
        computedFlag = "high";
      } else {
        computedFlag = "normal";
      }
    } else if (range.low !== undefined && range.high === undefined) {
      if (value.value < range.low) {
        computedFlag = "low";
      } else {
        computedFlag = "normal";
      }
    }
  } else if (value.isQualitative && range.expectedText) {
    const valLower = value.valueText.toLowerCase();
    const expLower = range.expectedText.toLowerCase();

    if (valLower === expLower) {
      computedFlag = "normal";
    } else if (
      (valLower.includes("positive") || valLower.includes("present")) &&
      (expLower.includes("negative") || expLower.includes("absent"))
    ) {
      computedFlag = "high";
    } else {
      computedFlag = "normal";
    }
  }

  // Decision 1: Trust printed lab flag if present
  if (labFlag) {
    let warning: string | undefined;
    if (computedFlag && computedFlag !== labFlag) {
      const isCriticalMatch =
        (labFlag === "critical_low" && computedFlag === "low") ||
        (labFlag === "critical_high" && computedFlag === "high");

      if (!isCriticalMatch) {
        warning = `Lab printed flag (${labFlag}) conflicts with computed range (${computedFlag}) for ${testName || "test"}`;
      }
    }
    return { flag: labFlag, warning };
  }

  // Decision 2: If no lab flag, use computed flag if range was present
  if (computedFlag) {
    return { flag: computedFlag };
  }

  // Decision 3: Complex or missing range and no lab flag -> neutral 'no_range' (never Normal!)
  return { flag: "no_range" };
}

/**
 * High-level pure parser for a single row: integrates value, unit, range, and flag.
 */
export function parseRowFields(
  valueCell: string,
  unitCell: string,
  rangeCell: string,
  testName?: string
): ParsedFieldResult {
  const normUnit = normalizeUnit(unitCell);
  const parsedVal = parseValueCell(valueCell, normUnit || undefined);
  const parsedRange = parseRangeCell(rangeCell);
  const { flag, warning } = resolveFlag(parsedVal, parsedRange, testName);

  return {
    value: parsedVal.value,
    valueText: parsedVal.valueText,
    modifier: parsedVal.modifier,
    unit: normUnit,
    refLow: parsedRange.low,
    refHigh: parsedRange.high,
    expectedText: parsedRange.expectedText,
    rawRange: parsedRange.rawRange,
    printedFlag: parsedVal.printedFlag,
    flag,
    warning,
  };
}
