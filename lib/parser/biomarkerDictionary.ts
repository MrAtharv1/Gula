import { BiomarkerCategory, BiomarkerDefinition, HealthStatus, BiomarkerFlag } from "@/lib/db/schema";

export const BIOMARKER_DEFINITIONS: Record<string, BiomarkerDefinition> = {
  hba1c: {
    canonicalKey: "hba1c",
    displayName: "Hemoglobin A1c",
    category: "Metabolic",
    standardUnit: "%",
    defaultLow: 4.0,
    defaultHigh: 5.6,
    description: "Average blood sugar levels over the past 2-3 months.",
    aliases: [
      "hba1c",
      "hemoglobin a1c",
      "glycated hemoglobin",
      "glycohemoglobin",
      "a1c",
      "hgb a1c",
    ],
  },
  glucose: {
    canonicalKey: "glucose",
    displayName: "Fasting Blood Glucose",
    category: "Metabolic",
    standardUnit: "mg/dL",
    defaultLow: 70,
    defaultHigh: 99,
    description: "Blood sugar level after an overnight fast.",
    aliases: [
      "glucose",
      "fasting glucose",
      "blood glucose",
      "fasting blood sugar",
      "glucose fasting",
      "fbs",
      "plasma glucose",
    ],
  },
  cholesterol_total: {
    canonicalKey: "cholesterol_total",
    displayName: "Total Cholesterol",
    category: "Lipid Panel",
    standardUnit: "mg/dL",
    defaultLow: 125,
    defaultHigh: 199,
    description: "Total amount of cholesterol in your blood.",
    aliases: [
      "total cholesterol",
      "cholesterol total",
      "serum cholesterol",
      "cholesterol",
    ],
  },
  cholesterol_hdl: {
    canonicalKey: "cholesterol_hdl",
    displayName: "HDL Cholesterol",
    category: "Lipid Panel",
    standardUnit: "mg/dL",
    defaultLow: 40,
    defaultHigh: 80,
    description: "High-density lipoprotein ('good' cholesterol). Higher is generally protective.",
    aliases: [
      "hdl cholesterol",
      "cholesterol hdl",
      "hdl",
      "hdl-c",
      "high density lipoprotein",
    ],
  },
  cholesterol_ldl: {
    canonicalKey: "cholesterol_ldl",
    displayName: "LDL Cholesterol",
    category: "Lipid Panel",
    standardUnit: "mg/dL",
    defaultLow: 50,
    defaultHigh: 99,
    description: "Low-density lipoprotein ('bad' cholesterol).",
    aliases: [
      "ldl cholesterol",
      "cholesterol ldl",
      "ldl",
      "ldl-c",
      "calculated ldl",
      "direct ldl",
      "low density lipoprotein",
    ],
  },
  triglycerides: {
    canonicalKey: "triglycerides",
    displayName: "Triglycerides",
    category: "Lipid Panel",
    standardUnit: "mg/dL",
    defaultLow: 0,
    defaultHigh: 149,
    description: "Type of fat stored in fat cells and found in circulating blood.",
    aliases: [
      "triglycerides",
      "serum triglycerides",
      "triglyceride",
      "tg",
    ],
  },
  vldl: {
    canonicalKey: "vldl",
    displayName: "VLDL Cholesterol",
    category: "Lipid Panel",
    standardUnit: "mg/dL",
    defaultLow: 5,
    defaultHigh: 30,
    description: "Very low-density lipoprotein cholesterol.",
    aliases: [
      "vldl",
      "vldl cholesterol",
      "vldl-c",
    ],
  },
  hemoglobin: {
    canonicalKey: "hemoglobin",
    displayName: "Hemoglobin",
    category: "Complete Blood Count",
    standardUnit: "g/dL",
    defaultLow: 13.5,
    defaultHigh: 17.5,
    description: "Oxygen-carrying protein in red blood cells.",
    aliases: [
      "hemoglobin",
      "hb",
      "hgb",
      "haemoglobin",
    ],
  },
  hematocrit: {
    canonicalKey: "hematocrit",
    displayName: "Hematocrit",
    category: "Complete Blood Count",
    standardUnit: "%",
    defaultLow: 38.8,
    defaultHigh: 50.0,
    description: "Proportion of red blood cells in your total blood volume.",
    aliases: [
      "hematocrit",
      "hct",
      "packed cell volume",
      "pcv",
    ],
  },
  rbc: {
    canonicalKey: "rbc",
    displayName: "Red Blood Cell Count",
    category: "Complete Blood Count",
    standardUnit: "M/uL",
    defaultLow: 4.3,
    defaultHigh: 5.9,
    description: "Total number of red blood cells in blood.",
    aliases: [
      "rbc",
      "red blood cells",
      "red blood cell count",
      "erythrocytes",
    ],
  },
  wbc: {
    canonicalKey: "wbc",
    displayName: "White Blood Cell Count",
    category: "Complete Blood Count",
    standardUnit: "K/uL",
    defaultLow: 4.5,
    defaultHigh: 11.0,
    description: "Cells that help fight infections.",
    aliases: [
      "wbc",
      "white blood cells",
      "white blood cell count",
      "leukocytes",
    ],
  },
  platelets: {
    canonicalKey: "platelets",
    displayName: "Platelet Count",
    category: "Complete Blood Count",
    standardUnit: "K/uL",
    defaultLow: 150,
    defaultHigh: 450,
    description: "Cell fragments essential for normal blood clotting.",
    aliases: [
      "platelets",
      "platelet count",
      "plt",
      "thrombocytes",
    ],
  },
  mcv: {
    canonicalKey: "mcv",
    displayName: "Mean Corpuscular Volume (MCV)",
    category: "Complete Blood Count",
    standardUnit: "fL",
    defaultLow: 80,
    defaultHigh: 100,
    description: "Average size of red blood cells.",
    aliases: [
      "mcv",
      "mean corpuscular volume",
    ],
  },
  mch: {
    canonicalKey: "mch",
    displayName: "Mean Corpuscular Hemoglobin (MCH)",
    category: "Complete Blood Count",
    standardUnit: "pg",
    defaultLow: 27,
    defaultHigh: 33,
    description: "Average amount of hemoglobin inside a red blood cell.",
    aliases: [
      "mch",
      "mean corpuscular hemoglobin",
    ],
  },
  mchc: {
    canonicalKey: "mchc",
    displayName: "MCHC",
    category: "Complete Blood Count",
    standardUnit: "g/dL",
    defaultLow: 32,
    defaultHigh: 36,
    description: "Average concentration of hemoglobin in given volume of red blood cells.",
    aliases: [
      "mchc",
      "mean corpuscular hemoglobin concentration",
    ],
  },
  tsh: {
    canonicalKey: "tsh",
    displayName: "Thyroid Stimulating Hormone (TSH)",
    category: "Thyroid",
    standardUnit: "uIU/mL",
    defaultLow: 0.4,
    defaultHigh: 4.0,
    description: "Pituitary hormone regulating thyroid hormone production.",
    aliases: [
      "tsh",
      "thyroid stimulating hormone",
      "thyrotropin",
      "ultrasensitive tsh",
    ],
  },
  free_t3: {
    canonicalKey: "free_t3",
    displayName: "Free Triiodothyronine (Free T3)",
    category: "Thyroid",
    standardUnit: "pg/mL",
    defaultLow: 2.0,
    defaultHigh: 4.4,
    description: "Active thyroid hormone.",
    aliases: [
      "free t3",
      "ft3",
      "triiodothyronine free",
    ],
  },
  free_t4: {
    canonicalKey: "free_t4",
    displayName: "Free Thyroxine (Free T4)",
    category: "Thyroid",
    standardUnit: "ng/dL",
    defaultLow: 0.8,
    defaultHigh: 1.8,
    description: "Main thyroid hormone circulating in the blood.",
    aliases: [
      "free t4",
      "ft4",
      "thyroxine free",
    ],
  },
  alt: {
    canonicalKey: "alt",
    displayName: "Alanine Aminotransferase (ALT/SGPT)",
    category: "Liver Function",
    standardUnit: "U/L",
    defaultLow: 7,
    defaultHigh: 55,
    description: "Enzyme found predominantly in liver cells.",
    aliases: [
      "alt",
      "sgpt",
      "alanine transaminase",
      "alanine aminotransferase",
    ],
  },
  ast: {
    canonicalKey: "ast",
    displayName: "Aspartate Aminotransferase (AST/SGOT)",
    category: "Liver Function",
    standardUnit: "U/L",
    defaultLow: 8,
    defaultHigh: 48,
    description: "Enzyme found in liver, heart, and muscle tissue.",
    aliases: [
      "ast",
      "sgot",
      "aspartate transaminase",
      "aspartate aminotransferase",
    ],
  },
  alp: {
    canonicalKey: "alp",
    displayName: "Alkaline Phosphatase (ALP)",
    category: "Liver Function",
    standardUnit: "U/L",
    defaultLow: 44,
    defaultHigh: 147,
    description: "Enzyme related to bile ducts and bone turnover.",
    aliases: [
      "alp",
      "alkaline phosphatase",
      "alk phos",
    ],
  },
  bilirubin_total: {
    canonicalKey: "bilirubin_total",
    displayName: "Total Bilirubin",
    category: "Liver Function",
    standardUnit: "mg/dL",
    defaultLow: 0.2,
    defaultHigh: 1.2,
    description: "Breakdown product of hemoglobin cleared by the liver.",
    aliases: [
      "total bilirubin",
      "bilirubin total",
      "serum bilirubin",
    ],
  },
  creatinine: {
    canonicalKey: "creatinine",
    displayName: "Serum Creatinine",
    category: "Kidney Function",
    standardUnit: "mg/dL",
    defaultLow: 0.7,
    defaultHigh: 1.3,
    description: "Waste product from muscle metabolism, excreted by kidneys.",
    aliases: [
      "creatinine",
      "serum creatinine",
      "creat",
    ],
  },
  bun: {
    canonicalKey: "bun",
    displayName: "Blood Urea Nitrogen (BUN)",
    category: "Kidney Function",
    standardUnit: "mg/dL",
    defaultLow: 7,
    defaultHigh: 20,
    description: "Waste product formed in liver from protein breakdown.",
    aliases: [
      "bun",
      "blood urea nitrogen",
      "urea nitrogen",
      "urea",
    ],
  },
  egfr: {
    canonicalKey: "egfr",
    displayName: "Estimated GFR",
    category: "Kidney Function",
    standardUnit: "mL/min/1.73m2",
    defaultLow: 60,
    defaultHigh: 120,
    description: "Estimates how efficiently your kidneys filter waste.",
    aliases: [
      "egfr",
      "gfr",
      "estimated glomerular filtration rate",
      "egfr ckd-epi",
    ],
  },
  uric_acid: {
    canonicalKey: "uric_acid",
    displayName: "Uric Acid",
    category: "Kidney Function",
    standardUnit: "mg/dL",
    defaultLow: 3.5,
    defaultHigh: 7.2,
    description: "Waste product from breakdown of purines.",
    aliases: [
      "uric acid",
      "serum uric acid",
      "urate",
    ],
  },
  vitamin_d: {
    canonicalKey: "vitamin_d",
    displayName: "Vitamin D (25-Hydroxy)",
    category: "Vitamins & Minerals",
    standardUnit: "ng/mL",
    defaultLow: 30,
    defaultHigh: 100,
    description: "Essential for bone health, immune function, and calcium absorption.",
    aliases: [
      "vitamin d, 25-hydroxy",
      "vitamin d 25-hydroxy",
      "25-hydroxy vitamin d",
      "25-oh vitamin d",
      "vitamin d total",
      "vitamin d",
      "vit d",
    ],
  },
  vitamin_b12: {
    canonicalKey: "vitamin_b12",
    displayName: "Vitamin B12",
    category: "Vitamins & Minerals",
    standardUnit: "pg/mL",
    defaultLow: 200,
    defaultHigh: 900,
    description: "Vital for nerve tissue health, brain function, and red blood cells.",
    aliases: [
      "vitamin b12",
      "vit b12",
      "cobalamin",
      "b12",
    ],
  },
  iron_serum: {
    canonicalKey: "iron_serum",
    displayName: "Serum Iron",
    category: "Vitamins & Minerals",
    standardUnit: "ug/dL",
    defaultLow: 60,
    defaultHigh: 170,
    description: "Amount of circulating iron in blood serum.",
    aliases: [
      "serum iron",
      "iron",
      "fe",
    ],
  },
  ferritin: {
    canonicalKey: "ferritin",
    displayName: "Ferritin",
    category: "Vitamins & Minerals",
    standardUnit: "ng/mL",
    defaultLow: 30,
    defaultHigh: 400,
    description: "Primary protein that stores iron inside cells.",
    aliases: [
      "ferritin",
      "serum ferritin",
    ],
  },
  calcium: {
    canonicalKey: "calcium",
    displayName: "Serum Calcium",
    category: "Electrolytes",
    standardUnit: "mg/dL",
    defaultLow: 8.5,
    defaultHigh: 10.5,
    description: "Essential mineral for bones, muscles, and nerve signaling.",
    aliases: [
      "calcium",
      "total calcium",
      "serum calcium",
      "ca",
    ],
  },
  potassium: {
    canonicalKey: "potassium",
    displayName: "Serum Potassium",
    category: "Electrolytes",
    standardUnit: "mmol/L",
    defaultLow: 3.5,
    defaultHigh: 5.1,
    description: "Crucial electrolyte for cardiac and neuromuscular function.",
    aliases: [
      "potassium",
      "serum potassium",
      "k",
    ],
  },
  sodium: {
    canonicalKey: "sodium",
    displayName: "Serum Sodium",
    category: "Electrolytes",
    standardUnit: "mmol/L",
    defaultLow: 135,
    defaultHigh: 145,
    description: "Major electrolyte regulating fluid balance and blood pressure.",
    aliases: [
      "sodium",
      "serum sodium",
      "na",
    ],
  },
  crp: {
    canonicalKey: "crp",
    displayName: "C-Reactive Protein (High Sensitivity)",
    category: "Inflammation",
    standardUnit: "mg/L",
    defaultLow: 0.0,
    defaultHigh: 3.0,
    description: "Marker of systemic inflammation and cardiovascular risk.",
    aliases: [
      "crp",
      "hs-crp",
      "c-reactive protein",
      "high sensitivity crp",
    ],
  },
};

export function matchBiomarkerDefinition(rawName: string): BiomarkerDefinition | null {
  const clean = rawName
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Direct exact alias match
  for (const def of Object.values(BIOMARKER_DEFINITIONS)) {
    for (const alias of def.aliases) {
      if (clean === alias) return def;
    }
  }

  // 2. Word boundary / sub-phrase match
  for (const def of Object.values(BIOMARKER_DEFINITIONS)) {
    for (const alias of def.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(clean)) return def;
    }
  }

  return null;
}

export function evaluateStatus(
  value: number,
  refLow?: number,
  refHigh?: number
): { status: HealthStatus; flag?: BiomarkerFlag } {
  if (refLow !== undefined && refHigh !== undefined) {
    const rangeSpan = refHigh - refLow;
    // 10% tolerance band for borderline readings
    const margin = Math.max(rangeSpan * 0.15, (refHigh || 100) * 0.1);

    if (value < refLow) {
      if (value >= refLow - margin) {
        return { status: "borderline", flag: "borderline" };
      }
      return { status: "abnormal", flag: "low" };
    }
    if (value > refHigh) {
      if (value <= refHigh + margin) {
        return { status: "borderline", flag: "borderline" };
      }
      return { status: "abnormal", flag: "high" };
    }
    return { status: "normal", flag: "normal" };
  }

  if (refLow !== undefined && refHigh === undefined) {
    const margin = (refLow || 50) * 0.1;
    if (value < refLow) {
      if (value >= refLow - margin) {
        return { status: "borderline", flag: "borderline" };
      }
      return { status: "abnormal", flag: "low" };
    }
    return { status: "normal", flag: "normal" };
  }

  if (refHigh !== undefined && refLow === undefined) {
    const margin = (refHigh || 100) * 0.1;
    if (value > refHigh) {
      if (value <= refHigh + margin) {
        return { status: "borderline", flag: "borderline" };
      }
      return { status: "abnormal", flag: "high" };
    }
    return { status: "normal", flag: "normal" };
  }

  return { status: "normal", flag: "normal" };
}
