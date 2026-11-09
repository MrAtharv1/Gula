/**
 * Pure mathematical trend insight detector (Zero AI).
 * Analyzes consecutive values in chronological order.
 */

export interface TrendInsightResult {
  direction: "rising" | "falling" | "stable";
  count: number;
  message: string;
}

/**
 * If the last 3 or more values keep rising or falling, returns a short line like:
 * "Rising across the last 3 reports." or "Falling across the last 4 reports."
 * Even when still in reference range.
 */
export function calculateTrendInsight(values: number[]): TrendInsightResult | null {
  if (!values || values.length < 3) {
    return null;
  }

  // Check last N consecutive points strictly rising
  let risingCount = 1;
  for (let i = values.length - 1; i > 0; i--) {
    if (values[i] > values[i - 1]) {
      risingCount++;
    } else {
      break;
    }
  }

  if (risingCount >= 3) {
    return {
      direction: "rising",
      count: risingCount,
      message: `Rising across the last ${risingCount} reports.`,
    };
  }

  // Check last N consecutive points strictly falling
  let fallingCount = 1;
  for (let i = values.length - 1; i > 0; i--) {
    if (values[i] < values[i - 1]) {
      fallingCount++;
    } else {
      break;
    }
  }

  if (fallingCount >= 3) {
    return {
      direction: "falling",
      count: fallingCount,
      message: `Falling across the last ${fallingCount} reports.`,
    };
  }

  return null;
}

/**
 * Calculates historical minimum and maximum from recorded values
 */
export function calculateHistoricalMinMax(values: number[]): { min: number; max: number } | null {
  if (!values || values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
