const TARGET_LABS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\bDr\.?\s*Lal\s*Path\s*Labs?\b|lalpathlabs\.com/i, canonical: "Dr Lal PathLabs" },
  { pattern: /\bThyrocare\b|thyrocare\.com/i, canonical: "Thyrocare" },
  { pattern: /\bMetropolis\s*Healthcare\b|\bMetropolis\b|metropolisindia\.com/i, canonical: "Metropolis" },
  { pattern: /\bSRL\s*Diagnostics\b|\bSRL\b|srlworld\.com/i, canonical: "SRL Diagnostics" },
  { pattern: /\bAgilus\s*Diagnostics\b|\bAgilus\b|agilusdiagnostics\.com/i, canonical: "Agilus Diagnostics" },
  { pattern: /\bRedcliffe\s*Labs?\b|\bRedcliffe\b|redcliffelabs\.com/i, canonical: "Redcliffe Labs" },
  { pattern: /\bOrange\s*Health\b|orangehealth\.in/i, canonical: "Orange Health Labs" },
  { pattern: /\bHealthians\b|healthians\.com/i, canonical: "Healthians" },
  { pattern: /\bApollo\s*Diagnostics\b|\bApollo\b|apollodiagnostics\.in/i, canonical: "Apollo Diagnostics" },
  { pattern: /\bTata\s*1mg\b|\b1mg\b|tata1mg\.com/i, canonical: "Tata 1mg" },
  { pattern: /\bPharmEasy\b|pharmeasy\.in/i, canonical: "PharmEasy Labs" },
  { pattern: /\bSuburban\s*Diagnostics\b|suburbandiagnostics\.com/i, canonical: "Suburban Diagnostics" },
  { pattern: /\bNeuberg\b|neubergdiagnostics\.com/i, canonical: "Neuberg Diagnostics" },
  { pattern: /\bVijaya\s*Diagnostic\b|vijayadiagnostic\.com/i, canonical: "Vijaya Diagnostic" },
  { pattern: /\bPathkind\s*Labs?\b|pathkindlabs\.com/i, canonical: "Pathkind Labs" },
  { pattern: /\bLupin\s*Diagnostics\b|lupindiagnostics\.com/i, canonical: "Lupin Diagnostics" },
  { pattern: /\bKrsnaa\s*Diagnostics\b|krsnaadiagnostics\.com/i, canonical: "Krsnaa Diagnostics" },
  { pattern: /\bMedall\b|medall\.in/i, canonical: "Medall Diagnostics" },
  { pattern: /\bMahajan\s*Imaging\b/i, canonical: "Mahajan Imaging" },
  { pattern: /\bMax\s*Healthcare\b/i, canonical: "Max Healthcare" },
  { pattern: /\bFortis\s*Healthcare\b/i, canonical: "Fortis Healthcare" },
  { pattern: /\bQuest\s*Diagnostics\b|questdiagnostics\.com/i, canonical: "Quest Diagnostics" },
  { pattern: /\bLabcorp\b|labcorp\.com/i, canonical: "Labcorp" },
  { pattern: /\bMayo\s*Clinic\s*Laboratories\b/i, canonical: "Mayo Clinic Laboratories" },
  { pattern: /\bBioReference\s*Laboratories\b/i, canonical: "BioReference Laboratories" },
];

/**
 * Detects diagnostic lab name from header, footer, website/email domain,
 * or explicit laboratory/pathology labels across the extracted PDF text.
 */
export function detectLabName(text: string): string {
  if (!text) return "Unknown lab";

  const allLines = text.split("\n");
  const headerText = allLines.slice(0, 35).join("\n");
  const footerText = allLines.slice(-40).join("\n");

  // 1. Check top header lines first (highest confidence)
  for (const entry of TARGET_LABS) {
    if (entry.pattern.test(headerText)) {
      return entry.canonical;
    }
  }

  // 2. Check full document (catches footer domains/emails when header logo is an image)
  for (const entry of TARGET_LABS) {
    if (entry.pattern.test(text)) {
      return entry.canonical;
    }
  }

  // 3. Look for explicit "Processed at / Lab Name / Center" labels in header or footer
  const probeLines = [...allLines.slice(0, 30), ...allLines.slice(-30)];
  for (const line of probeLines) {
    const labeled = line.match(
      /^(?:processed\s*at|lab(?:oratory)?\s*name|diagnostic\s*cent(?:er|re))\s*[:\-]\s*([^\n]{3,50})/i
    );
    if (labeled?.[1]) {
      const cleaned = labeled[1].replace(/\s+/g, " ").trim();
      if (cleaned.length >= 3 && !/unknown|n\/a|none/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  // 4. Generic line containing Diagnostics, Pathology, or Laboratories (header or footer)
  for (const line of probeLines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (
      clean.length >= 4 &&
      clean.length <= 50 &&
      /(?:diagnostics|pathology|path\s*labs?|laboratories|laboratory|clinical\s*lab)/i.test(clean) &&
      !/(?:report|result|patient|doctor|test|date|page|bill|invoice|accredited|sample|reference|method|specimen)/i.test(clean)
    ) {
      return clean;
    }
  }

  return "Unknown lab";
}
