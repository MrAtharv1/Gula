const MONTH_MAP: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

/**
 * Extracts clinical report date from raw report text.
 * Default precedence is Indian Day-First (DD/MM/YYYY) when ambiguous,
 * but correctly handles MM/DD/YYYY when day > 12.
 * Returns ISO 'YYYY-MM-DD' or null if no valid date is found.
 */
export function detectReportDate(text: string): string | null {
  if (!text || text.trim().length === 0) return null;

  // 1. Look for labeled dates first
  const labelRegexes = [
    /(?:collection\s*date|date\s*of\s*collection|date\s*collected|sample\s*date|specimen\s*date|specimen\s*collection\s*date|collected)[:\s]+([A-Za-z0-9\s,\/\-\.]+)/i,
    /(?:reported\s*date|report\s*date|reported|registered|registration\s*date)[:\s]+([A-Za-z0-9\s,\/\-\.]+)/i,
    /(?:test\s*date|order\s*date|service\s*date|date)[:\s]+([A-Za-z0-9\s,\/\-\.]+)/i,
  ];

  for (const regex of labelRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseDateString(match[1]);
      if (parsed) return parsed;
    }
  }

  // 2. Global search for dates in text
  // DD Mon YYYY or DD-Mon-YYYY (e.g. 15 Jan 2024, 05-May-2024)
  const textMonthMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+(20[12]\d)\b/i
  );
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, "0");
    const m = MONTH_MAP[textMonthMatch[2].toLowerCase()] || "01";
    const y = textMonthMatch[3];
    return `${y}-${m}-${d}`;
  }

  // YYYY-MM-DD
  const isoMatch = text.match(/\b(20[12]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Two-digit slashes/hyphens: N1/N2/YYYY
  const slashMatch = text.match(
    /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20[12]\d)\b/
  );
  if (slashMatch) {
    const n1 = parseInt(slashMatch[1], 10);
    const n2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];

    // If second number > 12, it must be MM/DD/YYYY
    if (n1 <= 12 && n2 > 12) {
      const m = String(n1).padStart(2, "0");
      const d = String(n2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    // Default to Indian day-first DD/MM/YYYY
    const d = String(n1).padStart(2, "0");
    const m = String(n2).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Mon DD, YYYY
  const alphaMatch = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(0?[1-9]|[12]\d|3[01]),?\s+(20[12]\d)\b/i
  );
  if (alphaMatch) {
    const m = MONTH_MAP[alphaMatch[1].toLowerCase()] || "01";
    const d = alphaMatch[2].padStart(2, "0");
    const y = alphaMatch[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function parseDateString(raw: string): string | null {
  const clean = raw.trim().slice(0, 30);

  // YYYY-MM-DD
  const iso = clean.match(/^(20[12]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  // DD Mon YYYY
  const textMonth = clean.match(
    /^(0?[1-9]|[12]\d|3[01])[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+(20[12]\d)/i
  );
  if (textMonth) {
    const d = textMonth[1].padStart(2, "0");
    const m = MONTH_MAP[textMonth[2].toLowerCase()] || "01";
    const y = textMonth[3];
    return `${y}-${m}-${d}`;
  }

  // Mon DD, YYYY
  const alpha = clean.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(0?[1-9]|[12]\d|3[01]),?\s+(20[12]\d)/i
  );
  if (alpha) {
    const m = MONTH_MAP[alpha[1].toLowerCase()] || "01";
    const d = alpha[2].padStart(2, "0");
    const y = alpha[3];
    return `${y}-${m}-${d}`;
  }

  // Two-digit slashes/hyphens: N1/N2/YYYY
  const slash = clean.match(
    /^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20[12]\d)/
  );
  if (slash) {
    const n1 = parseInt(slash[1], 10);
    const n2 = parseInt(slash[2], 10);
    const y = slash[3];

    // If second number > 12, it must be MM/DD/YYYY
    if (n1 <= 12 && n2 > 12) {
      const m = String(n1).padStart(2, "0");
      const d = String(n2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    // Default to Indian day-first DD/MM/YYYY
    const d = String(n1).padStart(2, "0");
    const m = String(n2).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}
