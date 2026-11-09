import { ParserOutput, ParsedResultItem } from "./types";
import { detectReportDate } from "./dateDetector";
import { detectLabName } from "./labDetector";
import { extractReferenceRange } from "./rangeExtractor";
import { isNonResultLine } from "./lineCleaner";
import {
  METRIC_DICTIONARY,
  matchMetric,
  evaluateResultFlag,
} from "@/lib/db/metricDictionary";
import { MetricCategory } from "@/lib/db/schema";

const KNOWN_UNITS = [
  "mg/dL",
  "g/dL",
  "uIU/mL",
  "µIU/mL",
  "mIU/L",
  "pg/mL",
  "ng/mL",
  "ng/dL",
  "ug/dL",
  "µg/dL",
  "mmol/L",
  "umol/L",
  "µmol/L",
  "mEq/L",
  "U/L",
  "IU/L",
  "IU/mL",
  "K/uL",
  "M/uL",
  "x10^3/uL",
  "x10E3/uL",
  "10*3/uL",
  "fL",
  "pg",
  "%",
  "mL/min/1.73m2",
  "mL/min",
  "mg/L",
  "mm/hr",
  "ratio",
  "index",
  "nmol/L",
];

export interface UnifiedParserResult extends ParserOutput {
  title: string;
  date: string;
  biomarkers: ParsedResultItem[];
  warnings: string[];
}

/**
 * Pure TypeScript deterministic report parser.
 * Never throws an uncaught exception; always returns a typed result.
 */
export function parsePdfText(rawText: string, totalPages = 1): UnifiedParserResult {
  const errors: string[] = [];
  const skippedLines: string[] = [];
  const results: ParsedResultItem[] = [];

  const createResult = (
    reportDate: string | null,
    labName: string,
    resList: ParsedResultItem[],
    conf: number,
    text: string
  ): UnifiedParserResult => {
    let title = "Lab Test Report";
    if (labName && labName !== "Unknown lab") {
      title = `${labName} Report`;
    }
    return {
      title,
      date: reportDate || "",
      reportDate,
      labName,
      results: resList,
      biomarkers: resList,
      skippedLines,
      confidence: conf,
      errors,
      warnings: errors,
      rawText: text,
      totalPages,
    };
  };

  try {
    if (!rawText || rawText.trim().length === 0) {
      errors.push("Empty document text. No characters could be extracted.");
      return createResult(null, "Unknown lab", [], 0, "");
    }

    if (rawText.trim().length < 20) {
      errors.push("This looks like a scanned copy. We can't read it yet. Try the original PDF from the lab.");
      return createResult(null, "Unknown lab", [], 0, rawText);
    }

    const reportDate = detectReportDate(rawText);
    const labName = detectLabName(rawText);

    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const processedMetricKeys = new Set<string>();
    let idCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isNonResultLine(line)) {
        continue;
      }

      let matchedInLine = false;

      // -------------------------------------------------------------
      // Strategy 1: Dictionary-Guided Alias Match (Highest Precision)
      // -------------------------------------------------------------
      for (const def of Object.values(METRIC_DICTIONARY)) {
        if (processedMetricKeys.has(def.canonicalKey)) continue;

        let matchedAlias: string | null = null;
        const sortedAliases = [...def.aliases].sort((a, b) => b.length - a.length);

        for (const alias of sortedAliases) {
          const escaped = alias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
          const regex = new RegExp(`\\b${escaped}\\b`, "i");
          const match = regex.exec(line);
          if (match) {
            // Ensure not part of a unit like mg/dL or %
            const charAfter = line.charAt(match.index + match[0].length);
            if (charAfter === "/" || charAfter === "%") {
              continue;
            }
            matchedAlias = match[0];
            break;
          }
        }

        if (!matchedAlias) continue;

        const aliasIdx = line.toLowerCase().indexOf(matchedAlias.toLowerCase());
        const remainder = line.slice(aliasIdx + matchedAlias.length).trim();

        const tokenData = extractTokensFromLineRemainder(remainder, def.standardUnit);
        if (tokenData && !isNaN(tokenData.value)) {
          const computedFlag = evaluateResultFlag(
            tokenData.value,
            tokenData.refLow ?? def.defaultLow,
            tokenData.refHigh ?? def.defaultHigh
          );
          const legacyStatus =
            computedFlag === "high" || computedFlag === "low"
              ? "abnormal"
              : computedFlag;

          results.push({
            id: `res-${idCounter++}`,
            metricKey: def.canonicalKey,
            canonicalKey: def.canonicalKey,
            name: def.displayName,
            displayName: def.displayName,
            value: tokenData.value,
            modifier: tokenData.modifier,
            unit: tokenData.unit || def.standardUnit,
            refLow: tokenData.refLow ?? def.defaultLow,
            refHigh: tokenData.refHigh ?? def.defaultHigh,
            rawRange: tokenData.rawRange,
            printedFlag: tokenData.printedFlag,
            flag: computedFlag,
            status: legacyStatus,
            category: def.category,
            confidence: tokenData.hasExplicitRange ? 0.95 : 0.85,
            selected: true,
          });

          processedMetricKeys.add(def.canonicalKey);
          matchedInLine = true;
          break;
        }
      }

      // -------------------------------------------------------------
      // Strategy 2: Generic Row Parser (For unmapped or colon-formatted tests)
      // -------------------------------------------------------------
      if (!matchedInLine) {
        const generic = parseGenericTableRow(line);
        if (generic && !processedMetricKeys.has(generic.metricKey)) {
          const dictMatch = matchMetric(generic.name);
          const finalKey = dictMatch ? dictMatch.canonicalKey : generic.metricKey;
          const finalDisplayName = dictMatch ? dictMatch.displayName : generic.name;
          const finalCategory: MetricCategory = dictMatch ? dictMatch.category : "Other";

          const refLow = generic.refLow ?? dictMatch?.defaultLow;
          const refHigh = generic.refHigh ?? dictMatch?.defaultHigh;
          const computedFlag = evaluateResultFlag(generic.value, refLow, refHigh);
          const legacyStatus =
            computedFlag === "high" || computedFlag === "low"
              ? "abnormal"
              : computedFlag;

          results.push({
            id: `res-${idCounter++}`,
            metricKey: finalKey,
            canonicalKey: finalKey,
            name: finalDisplayName,
            displayName: finalDisplayName,
            value: generic.value,
            modifier: generic.modifier,
            unit: generic.unit || dictMatch?.standardUnit || "",
            refLow,
            refHigh,
            rawRange: generic.rawRange,
            printedFlag: generic.printedFlag,
            flag: computedFlag,
            status: legacyStatus,
            category: finalCategory,
            confidence: dictMatch ? 0.8 : 0.6,
            selected: true,
          });

          processedMetricKeys.add(finalKey);
          matchedInLine = true;
        }
      }

      // Track unparsed lines containing numbers for partial success reporting
      if (
        !matchedInLine &&
        /\d+(?:\.\d+)?/.test(line) &&
        line.length > 5 &&
        line.length < 80
      ) {
        skippedLines.push(line);
      }
    }

    if (results.length === 0) {
      errors.push("We couldn't find any test results in this file.");
    }

    let overallConfidence = 0;
    if (results.length > 0) {
      const avgConf =
        results.reduce((acc, r) => acc + r.confidence, 0) / results.length;
      const penalty = Math.min(skippedLines.length * 0.03, 0.3);
      overallConfidence = Number(Math.max(0.1, avgConf - penalty).toFixed(2));
    }

    return createResult(reportDate, labName, results, overallConfidence, rawText);
  } catch (err: any) {
    console.error("Unhandled parsing error caught:", err);
    errors.push(err.message || "An unexpected error occurred while parsing.");
    return createResult(null, "Unknown lab", results, 0, rawText);
  }
}

/**
 * Extracts value, modifier, unit, printed flag, and range from line remainder
 */
function extractTokensFromLineRemainder(
  remainder: string,
  fallbackUnit: string
): {
  value: number;
  modifier?: "<" | ">";
  unit: string;
  refLow?: number;
  refHigh?: number;
  rawRange?: string;
  printedFlag?: string;
  hasExplicitRange: boolean;
} | null {
  const valMatch = remainder.match(/^[^\d<>=]*([<>]?)\s*(\d+(?:\.\d+)?)/);
  if (!valMatch) return null;

  const rawModifier = valMatch[1] === "<" || valMatch[1] === ">" ? (valMatch[1] as "<" | ">") : undefined;
  const value = parseFloat(valMatch[2]);
  if (isNaN(value)) return null;

  const afterVal = remainder.slice(remainder.indexOf(valMatch[2]) + valMatch[2].length).trim();

  let printedFlag: string | undefined;
  const flagMatch = afterVal.match(/\b(HIGH|LOW|CRITICAL|ALERT|[HL*])\b/i);
  if (flagMatch) {
    printedFlag = flagMatch[1].toUpperCase();
  }

  let detectedUnit = fallbackUnit;
  for (const u of KNOWN_UNITS) {
    const uReg = new RegExp(`\\b${u.replace(/[\^\*]/g, "\\$&")}\\b`, "i");
    if (uReg.test(afterVal) || uReg.test(remainder)) {
      detectedUnit = u;
      break;
    }
  }

  let refLow: number | undefined;
  let refHigh: number | undefined;
  let rawRange: string | undefined;
  let hasExplicitRange = false;

  const rangeCandidate = afterVal.match(
    /(?:(?:ref(?:erence)?\s*(?:range|interval|values?)?[:\s]*)?((?:desirable|optimal|normal|up\s*to)?[^a-z0-9]*[<>]?\s*\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*[<>]?\s*\d+(?:\.\d+)?.*|[<>]={0,1}\s*\d+(?:\.\d+)?))/i
  );

  if (rangeCandidate && rangeCandidate[1]) {
    const extracted = extractReferenceRange(rangeCandidate[1]);
    refLow = extracted.low;
    refHigh = extracted.high;
    rawRange = extracted.raw;
    hasExplicitRange = extracted.low !== undefined || extracted.high !== undefined;
  }

  return {
    value,
    modifier: rawModifier,
    unit: detectedUnit,
    refLow,
    refHigh,
    rawRange,
    printedFlag,
    hasExplicitRange,
  };
}

/**
 * Generic row extractor for unknown tests formatted in table columns or colon lists
 */
function parseGenericTableRow(line: string): {
  name: string;
  metricKey: string;
  value: number;
  modifier?: "<" | ">";
  unit: string;
  refLow?: number;
  refHigh?: number;
  rawRange?: string;
  printedFlag?: string;
} | null {
  // Pattern 1: Colons (e.g. "Special Cardiac Protein: 12.5 ng/mL (5.0 - 25.0)")
  const colonMatch = line.match(
    /^([A-Za-z0-9\s,\-\/\(\)]+?)\s*:\s*([<>]?)\s*(\d+(?:\.\d+)?)\s*(?:([HL]|HIGH|LOW|\*)\s+)?([A-Za-z%µ\/\^0-9]+)?\s*(?:\(?([<>]?\s*[\d\.\-\s–—to><]+)\)?)?$/i
  );

  // Pattern 2: Multi-space table columns
  const tableMatch = line.match(
    /^([A-Za-z0-9\s,\-\/\(\)]+?)\s{2,}([<>]?)\s*(\d+(?:\.\d+)?)\s*(?:([HL]|HIGH|LOW|CRITICAL|\*)\s+)?([A-Za-z%µ\/\^0-9]+)?\s*([<>]?\s*[\d\.\-\s–—to><]+)?$/i
  );

  const match = colonMatch || tableMatch;
  if (!match) return null;

  const name = match[1].trim();
  if (name.length < 2 || name.length > 50) return null;

  // Reject administrative, financial, and metadata non-test lines
  if (
    /(?:date|sample|specimen|invoice|bill|receipt|amount|total|patient|doctor|page|barcode|token|account|phone|email|tax|gst|\bid\b|\bno\b|number|due|thank|hospital|clinic|pay)/i.test(
      name
    )
  ) {
    return null;
  }

  const modifier = match[2] === "<" || match[2] === ">" ? (match[2] as "<" | ">") : undefined;
  const value = parseFloat(match[3]);
  if (isNaN(value)) return null;

  const printedFlag = match[4]?.toUpperCase();
  const unit = match[5]?.trim() || "";
  const rawRangeInput = match[6]?.trim() || "";

  let refLow: number | undefined;
  let refHigh: number | undefined;
  let rawRange: string | undefined;

  if (rawRangeInput) {
    const range = extractReferenceRange(rawRangeInput);
    refLow = range.low;
    refHigh = range.high;
    rawRange = range.raw;
  }

  const hasKnownUnit = KNOWN_UNITS.some((u) => u.toLowerCase() === unit.toLowerCase());
  const hasValidRange = refLow !== undefined || refHigh !== undefined;
  const hasPrintedFlag = Boolean(printedFlag);

  // If it's not a recognized dictionary test, it must have either a known unit, a valid range, or a printed flag
  const dictMatch = matchMetric(name);
  if (!dictMatch && !hasKnownUnit && !hasValidRange && !hasPrintedFlag) {
    return null;
  }

  const metricKey = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);

  return {
    name,
    metricKey,
    value,
    modifier,
    unit,
    refLow,
    refHigh,
    rawRange,
    printedFlag,
  };
}

export { parsePdfText as parseReportText };
