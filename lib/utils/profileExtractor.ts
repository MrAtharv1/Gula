export interface ExtractedProfileHints {
  fullName?: string;
  age?: string;
  sex?: "Male" | "Female" | "Other";
}

/**
 * Extracts non-sensitive demographic cues (name, age, sex) from the header
 * of uploaded lab PDF text inside the browser. Never modifies parser output.
 */
export function extractProfileHintsFromText(rawText: string): ExtractedProfileHints {
  if (!rawText) return {};
  // Only inspect the header/top portion of the report where patient summary sits
  const headerSlice = rawText.slice(0, 3500);
  const hints: ExtractedProfileHints = {};

  // 1. Patient / Name
  const nameMatch = headerSlice.match(
    /(?:patient\s*name|name)\s*[:\-]\s*(?:mr\.?|mrs\.?|ms\.?|dr\.?)?\s*([A-Za-z][A-Za-z .]{1,45}?)(?=\s{2,}|\n|\r|\bage\b|\bsex\b|\bgender\b|\buhid\b|\bpatient\b|\bdate\b|$)/i
  );
  if (nameMatch?.[1]) {
    const cleaned = nameMatch[1].replace(/\s+/g, " ").trim();
    if (
      cleaned.length >= 2 &&
      !/redacted|unknown|test|report|sample|patient|lab/i.test(cleaned)
    ) {
      hints.fullName = cleaned;
    }
  }

  // 2. Age & Sex combined e.g. "Age / Sex : 29 Y / Male" or "Age/Gender: 34 Yrs / F"
  const comboMatch = headerSlice.match(
    /(?:age\s*[\/&]\s*(?:sex|gender))\s*[:\-]\s*(\d{1,3})\s*(?:y|yrs?|years?)?\s*[\/|, ]\s*(male|female|m|f|other)\b/i
  );
  if (comboMatch) {
    const ageNum = parseInt(comboMatch[1], 10);
    if (ageNum > 0 && ageNum <= 120) {
      hints.age = String(ageNum);
    }
    const rawSex = comboMatch[2].toLowerCase();
    if (rawSex === "m" || rawSex === "male") hints.sex = "Male";
    else if (rawSex === "f" || rawSex === "female") hints.sex = "Female";
    else if (rawSex === "other") hints.sex = "Other";
  }

  // 3. Separate Age fallback
  if (!hints.age) {
    const ageMatch = headerSlice.match(
      /\bage\s*[:\-]\s*(\d{1,3})\s*(?:y|yrs?|years?)?\b/i
    );
    if (ageMatch?.[1]) {
      const ageNum = parseInt(ageMatch[1], 10);
      if (ageNum > 0 && ageNum <= 120) {
        hints.age = String(ageNum);
      }
    }
  }

  // 4. Separate Sex / Gender fallback
  if (!hints.sex) {
    const sexMatch = headerSlice.match(
      /\b(?:sex|gender)\s*[:\-]\s*(male|female|m|f|other)\b/i
    );
    if (sexMatch?.[1]) {
      const rawSex = sexMatch[1].toLowerCase();
      if (rawSex === "m" || rawSex === "male") hints.sex = "Male";
      else if (rawSex === "f" || rawSex === "female") hints.sex = "Female";
      else if (rawSex === "other") hints.sex = "Other";
    }
  }

  return hints;
}

/**
 * Computes BMI string (e.g. "22.9") from height in cm and weight in kg.
 */
export function computeBmi(heightCm: string, weightKg: string): string | null {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 40 || w <= 10) {
    return null;
  }
  const hm = h / 100;
  const bmi = w / (hm * hm);
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  return bmi.toFixed(1);
}
