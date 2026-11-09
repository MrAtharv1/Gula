const TARGET_LABS = [
  "Dr Lal PathLabs",
  "Thyrocare",
  "Metropolis Healthcare",
  "Metropolis",
  "SRL Diagnostics",
  "SRL",
  "Redcliffe Labs",
  "Redcliffe",
  "Healthians",
  "Apollo Diagnostics",
  "Apollo",
  "Tata 1mg",
  "1mg",
  "Quest Diagnostics",
  "Labcorp",
  "Mayo Clinic Laboratories",
  "BioReference Laboratories",
  "Pathkind Labs",
  "Max Healthcare",
  "Fortis Healthcare",
];

export function detectLabName(text: string): string {
  if (!text) return "Unknown lab";

  // Check top 25 lines of the report where headers reside
  const headerText = text.split("\n").slice(0, 25).join("\n");

  for (const lab of TARGET_LABS) {
    const regex = new RegExp(`\\b${lab.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (regex.test(headerText)) {
      // Return normalized clean lab name
      if (lab === "Metropolis Healthcare" || lab === "Metropolis") return "Metropolis";
      if (lab === "SRL Diagnostics" || lab === "SRL") return "SRL Diagnostics";
      if (lab === "Redcliffe Labs" || lab === "Redcliffe") return "Redcliffe Labs";
      if (lab === "Tata 1mg" || lab === "1mg") return "Tata 1mg";
      if (lab === "Apollo Diagnostics" || lab === "Apollo") return "Apollo Diagnostics";
      return lab;
    }
  }

  // Look for lines containing "Diagnostics", "Pathology", or "Laboratories"
  const lines = text.split("\n").slice(0, 15);
  for (const line of lines) {
    const clean = line.trim();
    if (
      clean.length >= 4 &&
      clean.length <= 45 &&
      /(?:diagnostics|pathology|laboratories|laboratory|clinical lab)/i.test(clean) &&
      !/(?:report|result|patient|doctor|test|date|page|bill|invoice)/i.test(clean)
    ) {
      return clean;
    }
  }

  return "Unknown lab";
}
