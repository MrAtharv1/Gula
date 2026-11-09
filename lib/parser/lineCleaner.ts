const NON_RESULT_PATTERNS = [
  /^(?:page\s*\d+|page\s*\d+\s*of\s*\d+|page\s*:\s*\d+)/i,
  /(?:not\s*valid\s*for\s*medico-legal|disclaimer|end\s*of\s*report|all\s*rights\s*reserved)/i,
  /(?:kindly\s*consult|please\s*correlate\s*clinically|clinical\s*correlation\s*is\s*recommended)/i,
  /(?:method\s*:|methodology\s*:|technique\s*:|test\s*method\s*:|instrument\s*:|analyzer\s*:)/i,
  /(?:interpretation\s*:|clinical\s*interpretation|note\s*:|comments?\s*:|caution\s*:)/i,
  /(?:referred\s*by|dr\.\s+[a-z]+|doctor\s*:|consultant\s*pathologist|lab\s*director|signature)/i,
  /(?:patient\s*name|name\s*of\s*patient|age\s*\/|gender\s*:|sex\s*:|uhid|barcode|mrn|sample\s*id)/i,
  /(?:phone\s*:|tel\s*:|email\s*:|website\s*:|gstin|cin\s*:|address\s*:|road|street|nagar|marg)/i,
  /(?:investigation\s*result|test\s*name\s*result|parameter\s*value|biological\s*reference)/i, // Header lines
  /^(?:sample\s*date|collection\s*date|collected|report\s*date|reported|registration\s*date|registered|specimen\s*date|date\s*collected|date\s*:|due\s*date)\s*:/i,
  /(?:invoice|receipt|order\s*id|transaction|amount|total\s*amount|balance|payment|due\s*date|terms\s*and\s*conditions)/i,
];

export function isNonResultLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return true;

  for (const pat of NON_RESULT_PATTERNS) {
    if (pat.test(trimmed)) {
      return true;
    }
  }

  return false;
}
