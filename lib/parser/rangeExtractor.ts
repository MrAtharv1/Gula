export interface ExtractedRange {
  low?: number;
  high?: number;
  raw: string;
}

export function extractReferenceRange(rawInput: string): ExtractedRange {
  if (!rawInput) return { raw: "" };
  const clean = rawInput.trim();
  if (!clean) return { raw: "" };

  // 1. Multi-tier ranges: e.g. "Desirable: <200 / Borderline: 200-239 / High: >=240"
  // or "Optimal: < 100, Near Optimal: 100-129, High: >= 160"
  if (/(?:desirable|optimal|normal)[:\s]/i.test(clean)) {
    const desirableMatch = clean.match(
      /(?:desirable|optimal|normal)[:\s]+(?:([<>]?=?\s*\d+(?:\.\d+)?(?:\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?)?))/i
    );
    if (desirableMatch && desirableMatch[1]) {
      const subRange = extractReferenceRange(desirableMatch[1]);
      if (subRange.low !== undefined || subRange.high !== undefined) {
        return {
          low: subRange.low,
          high: subRange.high,
          raw: clean,
        };
      }
    }
  }

  // 2. Standard two-number range: "13.0 - 17.0", "13.0-17.0", "70 to 99", "4.0 – 5.6"
  const twoNumMatch = clean.match(
    /([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:\.[0-9]+)?)/i
  );
  if (twoNumMatch) {
    const low = parseFloat(twoNumMatch[1]);
    const high = parseFloat(twoNumMatch[2]);
    if (!isNaN(low) && !isNaN(high) && low < high) {
      return { low, high, raw: clean };
    }
  }

  // 3. Up to / Less than: e.g. "< 200", "<= 150", "Up to 5.7", "Under 200", "<5.7"
  const lessMatch = clean.match(/(?:<|<=|under|up to|less than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (lessMatch) {
    const high = parseFloat(lessMatch[1]);
    if (!isNaN(high)) {
      return { high, raw: clean };
    }
  }

  // 4. Greater than / Over: e.g. "> 40", ">= 60", "Over 50", ">40"
  const greaterMatch = clean.match(/(?:>|>=|over|greater than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (greaterMatch) {
    const low = parseFloat(greaterMatch[1]);
    if (!isNaN(low)) {
      return { low, raw: clean };
    }
  }

  return { raw: clean };
}
