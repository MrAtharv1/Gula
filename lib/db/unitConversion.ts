/**
 * Clinical Unit Conversion Helpers
 *
 * Handles standard biochemical unit conversions between US conventional
 * (mg/dL) and SI standard (mmol/L, umol/L) units.
 */

export function convertGlucose(
  value: number,
  from: "mg/dL" | "mmol/L",
  to: "mg/dL" | "mmol/L"
): number {
  if (from === to) return value;
  // 1 mmol/L glucose = 18.0182 mg/dL
  if (from === "mg/dL" && to === "mmol/L") {
    return Number((value / 18.0182).toFixed(2));
  }
  if (from === "mmol/L" && to === "mg/dL") {
    return Number((value * 18.0182).toFixed(1));
  }
  return value;
}

export function convertCholesterol(
  value: number,
  from: "mg/dL" | "mmol/L",
  to: "mg/dL" | "mmol/L"
): number {
  if (from === to) return value;
  // 1 mmol/L cholesterol = 38.67 mg/dL
  if (from === "mg/dL" && to === "mmol/L") {
    return Number((value / 38.67).toFixed(2));
  }
  if (from === "mmol/L" && to === "mg/dL") {
    return Number((value * 38.67).toFixed(1));
  }
  return value;
}

export function convertTriglycerides(
  value: number,
  from: "mg/dL" | "mmol/L",
  to: "mg/dL" | "mmol/L"
): number {
  if (from === to) return value;
  // 1 mmol/L triglyceride = 88.57 mg/dL
  if (from === "mg/dL" && to === "mmol/L") {
    return Number((value / 88.57).toFixed(2));
  }
  if (from === "mmol/L" && to === "mg/dL") {
    return Number((value * 88.57).toFixed(1));
  }
  return value;
}

export function convertCreatinine(
  value: number,
  from: "mg/dL" | "umol/L" | "µmol/L",
  to: "mg/dL" | "umol/L" | "µmol/L"
): number {
  const normFrom = from.replace("µ", "u");
  const normTo = to.replace("µ", "u");
  if (normFrom === normTo) return value;

  // 1 mg/dL creatinine = 88.4 umol/L
  if (normFrom === "mg/dL" && normTo === "umol/L") {
    return Number((value * 88.4).toFixed(1));
  }
  if (normFrom === "umol/L" && normTo === "mg/dL") {
    return Number((value / 88.4).toFixed(2));
  }
  return value;
}

/**
 * Universal unit converter for known canonical metric keys
 */
export function convertMetricUnit(
  metricKey: string,
  value: number,
  fromUnit: string,
  toUnit: string
): { value: number; unit: string } {
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  if (f === t) return { value, unit: toUnit };

  if (metricKey.includes("glucose")) {
    if ((f === "mg/dl" && t === "mmol/l") || (f === "mmol/l" && t === "mg/dl")) {
      return {
        value: convertGlucose(value, f === "mg/dl" ? "mg/dL" : "mmol/L", t === "mg/dl" ? "mg/dL" : "mmol/L"),
        unit: toUnit,
      };
    }
  }

  if (metricKey === "cholesterol_total" || metricKey === "ldl" || metricKey === "hdl" || metricKey === "vldl") {
    if ((f === "mg/dl" && t === "mmol/l") || (f === "mmol/l" && t === "mg/dl")) {
      return {
        value: convertCholesterol(value, f === "mg/dl" ? "mg/dL" : "mmol/L", t === "mg/dl" ? "mg/dL" : "mmol/L"),
        unit: toUnit,
      };
    }
  }

  if (metricKey === "triglycerides") {
    if ((f === "mg/dl" && t === "mmol/l") || (f === "mmol/l" && t === "mg/dl")) {
      return {
        value: convertTriglycerides(value, f === "mg/dl" ? "mg/dL" : "mmol/L", t === "mg/dl" ? "mg/dL" : "mmol/L"),
        unit: toUnit,
      };
    }
  }

  return { value, unit: fromUnit };
}
