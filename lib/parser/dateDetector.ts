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

export interface DetectedDateResult {
  reportDate: string | null;
  warning?: string;
}

export type DateInput = string | Array<{ fullText?: string } | string> | { fullText?: string };

/**
 * Extracts clinical report date from text or extracted pages.
 * Priority:
 * 1. "Sample Collected" date (date only, discard time).
 * 2. "Collection Date", "Date of Collection", "Date Collected", "Specimen Collection Date".
 * 3. "Report Date", "Reported Date", "Registration Date".
 * Never uses print date or instrument run date.
 * If conflicting collection dates appear, keeps the earliest valid collection date and adds a note.
 */
export function detectReportDateWithWarning(input: DateInput): DetectedDateResult {
  let text = "";
  if (Array.isArray(input)) {
    text = input.map((item) => (typeof item === "string" ? item : item.fullText || "")).join("\n");
  } else if (typeof input === "string") {
    text = input;
  } else if (input && typeof (input as any).fullText === "string") {
    text = (input as any).fullText;
  }

  if (!text || text.trim().length === 0) {
    return { reportDate: null };
  }

  // Lines to strictly exclude (print dates, instrument run dates)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const filteredLines = lines.filter(
    (line) => !/(?:printed?\s*(?:date|on|time)|instrument\s*run|run\s*date)/i.test(line)
  );
  const cleanText = filteredLines.join("\n");

  // Priority 1 & 2: Collection dates
  const foundCollectionDates: string[] = [];

  for (const line of filteredLines) {
    const m = line.match(
      /(?:sample\s*collected|specimen\s*collected|collection\s*date|date\s*of\s*collection|date\s*collected|specimen\s*collection\s*date)[:\s]+(.+)/i
    );
    if (m && m[1]) {
      const rawVal = m[1].split(/(?:report\s*date|report\s*status|status|approved|printed)/i)[0].trim();
      const parsed = parseDateString(rawVal);
      if (parsed && !foundCollectionDates.includes(parsed)) {
        foundCollectionDates.push(parsed);
      }
    }
  }

  if (foundCollectionDates.length > 0) {
    // Sort chronologically
    foundCollectionDates.sort();
    const earliest = foundCollectionDates[0];
    let warning: string | undefined;
    if (foundCollectionDates.length > 1) {
      warning = `Multiple collection dates detected (${foundCollectionDates.join(", ")}); using earliest: ${earliest}`;
    }
    return { reportDate: earliest, warning };
  }

  // Priority 3: Report Date / Reported Date / Registration Date
  const foundReportDates: string[] = [];
  for (const line of filteredLines) {
    const m = line.match(
      /(?:report\s*date|reported\s*date|date\s*reported|registration\s*date|registered|test\s*date|order\s*date)[:\s]+(.+)/i
    );
    if (m && m[1]) {
      const rawVal = m[1].split(/(?:report\s*status|status|approved|printed)/i)[0].trim();
      const parsed = parseDateString(rawVal);
      if (parsed && !foundReportDates.includes(parsed)) {
        foundReportDates.push(parsed);
      }
    }
  }

  if (foundReportDates.length > 0) {
    foundReportDates.sort();
    return { reportDate: foundReportDates[0] };
  }

  // Fallback: Global search for dates in cleanText
  // DD Mon YYYY or DD-Mon-YYYY
  const textMonthMatch = cleanText.match(
    /\b(0?[1-9]|[12]\d|3[01])[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+(20[12]\d)\b/i
  );
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, "0");
    const m = MONTH_MAP[textMonthMatch[2].toLowerCase()] || "01";
    const y = textMonthMatch[3];
    return { reportDate: `${y}-${m}-${d}` };
  }

  // Mon DD, YYYY (e.g. Sep 05, 2026)
  const alphaMatch = cleanText.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(0?[1-9]|[12]\d|3[01]),?\s+(20[12]\d)\b/i
  );
  if (alphaMatch) {
    const m = MONTH_MAP[alphaMatch[1].toLowerCase()] || "01";
    const d = alphaMatch[2].padStart(2, "0");
    const y = alphaMatch[3];
    return { reportDate: `${y}-${m}-${d}` };
  }

  // YYYY-MM-DD
  const isoMatch = cleanText.match(/\b(20[12]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return { reportDate: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` };
  }

  // Two-digit slashes/hyphens: N1/N2/YYYY (Indian/UK day-first)
  const slashMatch = cleanText.match(
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
      return { reportDate: `${y}-${m}-${d}` };
    }

    // Default to Indian/UK day-first DD/MM/YYYY
    const d = String(n1).padStart(2, "0");
    const m = String(n2).padStart(2, "0");
    return { reportDate: `${y}-${m}-${d}` };
  }

  return { reportDate: null };
}

/**
 * Backward-compatible helper returning string | null
 */
export function detectReportDate(input: DateInput): string | null {
  return detectReportDateWithWarning(input).reportDate;
}

export function parseDateString(raw: string): string | null {
  const clean = raw.trim().slice(0, 35);

  // Mon DD, YYYY (e.g. "Sep 05, 2026", "Sep 05, 2026, 08:23 AM")
  const alpha = clean.match(
    /^(?:[^\w]*)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(0?[1-9]|[12]\d|3[01]),?\s+(20[12]\d)/i
  );
  if (alpha) {
    const m = MONTH_MAP[alpha[1].toLowerCase()] || "01";
    const d = alpha[2].padStart(2, "0");
    const y = alpha[3];
    return `${y}-${m}-${d}`;
  }

  // DD Mon YYYY (e.g. "05 Sep 2026", "05-Sep-2026")
  const textMonth = clean.match(
    /^(?:[^\w]*)(0?[1-9]|[12]\d|3[01])[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+(20[12]\d)/i
  );
  if (textMonth) {
    const d = textMonth[1].padStart(2, "0");
    const m = MONTH_MAP[textMonth[2].toLowerCase()] || "01";
    const y = textMonth[3];
    return `${y}-${m}-${d}`;
  }

  // YYYY-MM-DD
  const iso = clean.match(/^(?:[^\w]*)(20[12]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  // Two-digit slashes/hyphens: N1/N2/YYYY (Indian/UK DD/MM/YYYY)
  const slash = clean.match(
    /^(?:[^\w]*)(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20[12]\d)/
  );
  if (slash) {
    const n1 = parseInt(slash[1], 10);
    const n2 = parseInt(slash[2], 10);
    const y = slash[3];

    if (n1 <= 12 && n2 > 12) {
      const m = String(n1).padStart(2, "0");
      const d = String(n2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const d = String(n1).padStart(2, "0");
    const m = String(n2).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}
