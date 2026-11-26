import { MetricCategory } from "@/lib/db/schema";

export interface NormalizedMetricResult {
  canonicalKey: string;
  displayName: string;
  category: MetricCategory;
  standardUnit: string;
  defaultLow?: number;
  defaultHigh?: number;
  isKnown: boolean;
}

export interface MetricDefinitionInternal {
  canonicalKey: string;
  displayName: string;
  category: MetricCategory;
  standardUnit: string;
  defaultLow?: number;
  defaultHigh?: number;
  aliases: string[];
}

/**
 * Normalizes a raw string by removing non-alphanumeric characters and collapsing whitespace
 */
export function cleanPunctuation(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Creates a slug suitable for canonical keys from any string
 */
export function slugify(str: string): string {
  const s = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.slice(0, 40) || "unknown_metric";
}

// =========================================================================
// DEFINITIONS
// =========================================================================

export const KNOWN_METRICS: MetricDefinitionInternal[] = [
  // ----------------- Blood (CBC & Hematology) -----------------
  {
    canonicalKey: "hemoglobin",
    displayName: "Hemoglobin",
    category: "Blood",
    standardUnit: "g/dL",
    defaultLow: 13.0,
    defaultHigh: 17.0,
    aliases: ["hemoglobin", "hb", "hgb", "haemoglobin", "total hemoglobin"],
  },
  {
    canonicalKey: "rbc",
    displayName: "Red Blood Cell Count",
    category: "Blood",
    standardUnit: "10^6/µl",
    defaultLow: 4.5,
    defaultHigh: 5.5,
    aliases: ["rbc count", "rbc", "red blood cell count", "red blood cells", "erythrocyte count", "total rbc"],
  },
  {
    canonicalKey: "hematocrit",
    displayName: "Hematocrit (PCV)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 40.0,
    defaultHigh: 50.0,
    aliases: ["hematocrit", "pcv", "packed cell volume", "hct"],
  },
  {
    canonicalKey: "mcv",
    displayName: "Mean Corpuscular Volume (MCV)",
    category: "Blood",
    standardUnit: "fl",
    defaultLow: 83.0,
    defaultHigh: 101.0,
    aliases: ["mcv", "mean corpuscular volume"],
  },
  {
    canonicalKey: "mch",
    displayName: "Mean Corpuscular Hemoglobin (MCH)",
    category: "Blood",
    standardUnit: "pg",
    defaultLow: 27.0,
    defaultHigh: 32.0,
    aliases: ["mch", "mean corpuscular hemoglobin"],
  },
  {
    canonicalKey: "mchc",
    displayName: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
    category: "Blood",
    standardUnit: "g/dL",
    defaultLow: 31.5,
    defaultHigh: 34.5,
    aliases: ["mchc", "mean corpuscular hemoglobin concentration"],
  },
  {
    canonicalKey: "rdw_cv",
    displayName: "RDW (CV)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 11.6,
    defaultHigh: 14.0,
    aliases: ["rdw (cv)", "rdw-cv", "rdw cv", "rdw", "red cell distribution width", "red cell distribution width - cv", "rdw_cv"],
  },
  {
    canonicalKey: "rdw_sd",
    displayName: "RDW-SD",
    category: "Blood",
    standardUnit: "fl",
    defaultLow: 35.1,
    defaultHigh: 43.9,
    aliases: ["rdw-sd", "rdw sd", "rdw_sd", "red cell distribution width - sd"],
  },
  {
    canonicalKey: "wbc",
    displayName: "Total Leukocyte Count (TLC / WBC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 4.0,
    defaultHigh: 10.0,
    aliases: ["tlc", "total leukocyte count", "total leucocyte count", "wbc", "white blood cell count", "white blood cells", "leukocytes"],
  },
  {
    canonicalKey: "neutrophils_pct",
    displayName: "Neutrophils (%)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 40.0,
    defaultHigh: 80.0,
    aliases: ["neutrophils", "neutrophil count", "polys", "segs", "segmented neutrophils", "neutrophils %", "neutrophils pct"],
  },
  {
    canonicalKey: "neutrophils_abs",
    displayName: "Absolute Neutrophils (ANC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 2.0,
    defaultHigh: 7.0,
    aliases: ["neutrophils.", "absolute neutrophils", "anc", "absolute neutrophil count", "neutrophils absolute", "absolute count - neutrophils"],
  },
  {
    canonicalKey: "lymphocytes_pct",
    displayName: "Lymphocytes (%)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 20.0,
    defaultHigh: 40.0,
    aliases: ["lymphocytes", "lymphocyte count", "lymphs", "lymphocytes %", "lymphocytes pct"],
  },
  {
    canonicalKey: "lymphocytes_abs",
    displayName: "Absolute Lymphocytes (ALC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 1.0,
    defaultHigh: 3.0,
    aliases: ["lymphocytes.", "absolute lymphocytes", "alc", "absolute lymphocyte count", "lymphocytes absolute", "absolute count - lymphocytes"],
  },
  {
    canonicalKey: "monocytes_pct",
    displayName: "Monocytes (%)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 2.0,
    defaultHigh: 10.0,
    aliases: ["monocytes", "monocyte count", "monos", "monocytes %", "monocytes pct"],
  },
  {
    canonicalKey: "monocytes_abs",
    displayName: "Absolute Monocytes (AMC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 0.2,
    defaultHigh: 1.0,
    aliases: ["monocytes.", "absolute monocytes", "amc", "absolute monocyte count", "monocytes absolute", "absolute count - monocytes"],
  },
  {
    canonicalKey: "eosinophils_pct",
    displayName: "Eosinophils (%)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 1.0,
    defaultHigh: 6.0,
    aliases: ["eosinophils", "eosinophil count", "eos", "eosinophils %", "eosinophils pct"],
  },
  {
    canonicalKey: "eosinophils_abs",
    displayName: "Absolute Eosinophils (AEC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 0.02,
    defaultHigh: 0.5,
    aliases: ["eosinophils.", "absolute eosinophils", "aec", "absolute eosinophil count", "eosinophils absolute", "absolute count - eosinophils"],
  },
  {
    canonicalKey: "basophils_pct",
    displayName: "Basophils (%)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 0.0,
    defaultHigh: 2.0,
    aliases: ["basophils", "basophil count", "basos", "basophils %", "basophils pct"],
  },
  {
    canonicalKey: "basophils_abs",
    displayName: "Absolute Basophils (ABC)",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 0.02,
    defaultHigh: 0.1,
    aliases: ["basophils.", "absolute basophils", "abc", "absolute basophil count", "basophils absolute", "absolute count - basophils"],
  },
  {
    canonicalKey: "platelets",
    displayName: "Platelet Count",
    category: "Blood",
    standardUnit: "10^3/µl",
    defaultLow: 150.0,
    defaultHigh: 410.0,
    aliases: ["platelet count", "platelets", "plt", "thrombocytes", "total platelet count"],
  },
  {
    canonicalKey: "mpv",
    displayName: "Mean Platelet Volume (MPV)",
    category: "Blood",
    standardUnit: "fL",
    defaultLow: 9.3,
    defaultHigh: 12.1,
    aliases: ["mean platelet volume (mpv)", "mean platelet volume", "mpv"],
  },
  {
    canonicalKey: "pct_platelet",
    displayName: "Plateletcrit (PCT)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 0.17,
    defaultHigh: 0.32,
    aliases: ["pct", "plateletcrit", "platelet hematocrit"],
  },
  {
    canonicalKey: "pdw",
    displayName: "Platelet Distribution Width (PDW)",
    category: "Blood",
    standardUnit: "fL",
    defaultLow: 8.3,
    defaultHigh: 25.0,
    aliases: ["pdw", "platelet distribution width"],
  },
  {
    canonicalKey: "p_lcr",
    displayName: "Platelet Large Cell Ratio (P-LCR)",
    category: "Blood",
    standardUnit: "%",
    defaultLow: 18.0,
    defaultHigh: 50.0,
    aliases: ["p-lcr", "p lcr", "platelet large cell ratio"],
  },
  {
    canonicalKey: "p_lcc",
    displayName: "Platelet Large Cell Count (P-LCC)",
    category: "Blood",
    standardUnit: "10^9/L",
    defaultLow: 44.0,
    defaultHigh: 140.0,
    aliases: ["p-lcc", "p lcc", "platelet large cell count"],
  },
  {
    canonicalKey: "mentzer_index",
    displayName: "Mentzer Index",
    category: "Blood",
    standardUnit: "ratio",
    defaultLow: 13.0,
    aliases: ["mentzer index", "mentzer ratio"],
  },
  {
    canonicalKey: "esr",
    displayName: "ESR - Erythrocyte Sedimentation Rate",
    category: "Blood",
    standardUnit: "mm/hr",
    defaultLow: 0.0,
    defaultHigh: 12.0,
    aliases: ["esr - erythrocyte sedimentation rate", "erythrocyte sedimentation rate", "esr", "sed rate", "erythrocyte sedimentation rate (esr)"],
  },

  // ----------------- Sugar & Metabolic -----------------
  {
    canonicalKey: "hba1c",
    displayName: "Glycosylated Hemoglobin (HbA1c)",
    category: "Sugar",
    standardUnit: "%",
    defaultLow: 4.0,
    defaultHigh: 5.6,
    aliases: [
      "glycosylated hemoglobin (hba1c)",
      "glycosylated hemoglobin",
      "glycated hemoglobin",
      "glycohemoglobin",
      "hemoglobin a1c",
      "hba1c (glycosylated haemoglobin)",
      "hba1c",
      "a1c",
      "hgb a1c",
    ],
  },
  {
    canonicalKey: "estimated_average_glucose",
    displayName: "Estimated Average Glucose",
    category: "Sugar",
    standardUnit: "mg/dL",
    defaultLow: 70.0,
    defaultHigh: 126.0,
    aliases: ["estimated average glucose", "eag", "estimated avg glucose"],
  },
  {
    canonicalKey: "glucose_fasting",
    displayName: "Glucose Fasting",
    category: "Sugar",
    standardUnit: "mg/dL",
    defaultLow: 70.0,
    defaultHigh: 100.0,
    aliases: [
      "glucose fasting",
      "blood sugar fasting",
      "fasting blood sugar",
      "fasting glucose",
      "fasting blood glucose",
      "fbs",
      "plasma glucose fasting",
    ],
  },
  {
    canonicalKey: "glucose_pp",
    displayName: "Glucose Post Prandial",
    category: "Sugar",
    standardUnit: "mg/dL",
    defaultLow: 70.0,
    defaultHigh: 140.0,
    aliases: [
      "glucose post prandial",
      "post prandial glucose",
      "postprandial glucose",
      "blood sugar post prandial",
      "ppbs",
      "pp glucose",
      "postprandial blood glucose",
      "glucose pp",
    ],
  },
  {
    canonicalKey: "glucose_random",
    displayName: "Random Blood Glucose",
    category: "Sugar",
    standardUnit: "mg/dL",
    defaultLow: 70.0,
    defaultHigh: 140.0,
    aliases: ["random glucose", "rbs", "random blood sugar", "glucose random"],
  },
  {
    canonicalKey: "insulin_fasting",
    displayName: "Fasting Insulin",
    category: "Sugar",
    standardUnit: "uIU/mL",
    defaultLow: 2.6,
    defaultHigh: 24.9,
    aliases: ["fasting insulin", "insulin fasting", "serum insulin", "insulin"],
  },
  {
    canonicalKey: "c_peptide",
    displayName: "C-Peptide",
    category: "Sugar",
    standardUnit: "ng/mL",
    defaultLow: 0.8,
    defaultHigh: 3.1,
    aliases: ["c-peptide", "c peptide"],
  },
  {
    canonicalKey: "homa_ir",
    displayName: "HOMA-IR",
    category: "Sugar",
    standardUnit: "index",
    defaultLow: 0.5,
    defaultHigh: 1.9,
    aliases: ["homa-ir", "homa ir"],
  },

  // ----------------- Liver Function -----------------
  {
    canonicalKey: "bilirubin_total",
    displayName: "Bilirubin Total",
    category: "Liver",
    standardUnit: "mg/dL",
    defaultLow: 0.2,
    defaultHigh: 1.2,
    aliases: ["bilirubin total", "total bilirubin", "serum bilirubin"],
  },
  {
    canonicalKey: "bilirubin_direct",
    displayName: "Bilirubin Direct",
    category: "Liver",
    standardUnit: "mg/dL",
    defaultLow: 0.0,
    defaultHigh: 0.5,
    aliases: ["bilirubin direct", "direct bilirubin", "conjugated bilirubin"],
  },
  {
    canonicalKey: "bilirubin_indirect",
    displayName: "Bilirubin Indirect",
    category: "Liver",
    standardUnit: "mg/dL",
    defaultLow: 0.1,
    defaultHigh: 0.7,
    aliases: ["bilirubin indirect", "indirect bilirubin", "unconjugated bilirubin"],
  },
  {
    canonicalKey: "ast",
    displayName: "SGOT / AST",
    category: "Liver",
    standardUnit: "U/L",
    defaultLow: 10.0,
    defaultHigh: 50.0,
    aliases: [
      "sgot/ast",
      "sgot / ast",
      "sgot",
      "ast",
      "aspartate aminotransferase",
      "aspartate transaminase",
      "sgot (ast)",
    ],
  },
  {
    canonicalKey: "alt",
    displayName: "SGPT / ALT",
    category: "Liver",
    standardUnit: "U/L",
    defaultLow: 10.0,
    defaultHigh: 50.0,
    aliases: [
      "sgpt/alt",
      "sgpt / alt",
      "sgpt",
      "alt",
      "alanine aminotransferase",
      "alanine transaminase",
      "sgpt (alt)",
    ],
  },
  {
    canonicalKey: "sgot_sgpt_ratio",
    displayName: "SGOT / SGPT Ratio",
    category: "Liver",
    standardUnit: "ratio",
    defaultLow: 0.8,
    defaultHigh: 2.0,
    aliases: [
      "sgot / sgpt ratio",
      "sgot/sgpt ratio",
      "ast/alt ratio",
      "ast / alt ratio",
      "de ritis ratio",
      "sgot to sgpt ratio",
    ],
  },
  {
    canonicalKey: "alp",
    displayName: "Alkaline Phosphatase (ALP)",
    category: "Liver",
    standardUnit: "U/L",
    defaultLow: 30.0,
    defaultHigh: 120.0,
    aliases: ["alkaline phosphatase", "alp", "alk phos", "serum alkaline phosphatase"],
  },
  {
    canonicalKey: "ggt",
    displayName: "Gamma Glutamyl Transferase (GGT)",
    category: "Liver",
    standardUnit: "U/L",
    defaultLow: 0.0,
    defaultHigh: 55.0,
    aliases: [
      "gamma glutamyl transferase (ggt)",
      "gamma glutamyl transferase",
      "gamma glutamyl transpeptidase",
      "ggt",
      "gamma-gt",
      "ggtp",
    ],
  },
  {
    canonicalKey: "protein_total",
    displayName: "Total Protein",
    category: "Liver",
    standardUnit: "g/dL",
    defaultLow: 5.7,
    defaultHigh: 8.2,
    aliases: ["total protein", "protein total", "serum total protein", "protein, total"],
  },
  {
    canonicalKey: "albumin",
    displayName: "Albumin",
    category: "Liver",
    standardUnit: "g/dL",
    defaultLow: 3.2,
    defaultHigh: 4.8,
    aliases: ["albumin", "serum albumin", "alb"],
  },
  {
    canonicalKey: "globulin",
    displayName: "Globulin",
    category: "Liver",
    standardUnit: "g/dL",
    defaultLow: 2.0,
    defaultHigh: 3.5,
    aliases: ["globulin", "serum globulin"],
  },
  {
    canonicalKey: "ag_ratio",
    displayName: "A/G Ratio",
    category: "Liver",
    standardUnit: "ratio",
    defaultLow: 0.9,
    defaultHigh: 2.0,
    aliases: ["a/g ratio", "ag ratio", "albumin / globulin ratio", "albumin/globulin ratio", "a / g ratio", "albumin to globulin ratio"],
  },

  // ----------------- Kidney Function -----------------
  {
    canonicalKey: "blood_urea",
    displayName: "Blood Urea",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 13.0,
    defaultHigh: 43.0,
    aliases: ["blood urea", "urea", "serum urea"],
  },
  {
    canonicalKey: "bun",
    displayName: "BUN (Blood Urea Nitrogen)",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 6.0,
    defaultHigh: 20.0,
    aliases: ["bun", "blood urea nitrogen", "urea nitrogen"],
  },
  {
    canonicalKey: "creatinine",
    displayName: "Creatinine",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 0.6,
    defaultHigh: 1.3,
    aliases: ["creatinine", "serum creatinine", "creat"],
  },
  {
    canonicalKey: "egfr",
    displayName: "eGFR (CKD-EPI)",
    category: "Kidney",
    standardUnit: "mL/min/1.73m²",
    defaultLow: 90.0,
    aliases: [
      "egfr (ckd-epi)",
      "egfr",
      "gfr",
      "estimated glomerular filtration rate",
      "ckd-epi",
      "estimated gfr",
    ],
  },
  {
    canonicalKey: "bun_creat_ratio",
    displayName: "BUN / Creatinine Ratio",
    category: "Kidney",
    standardUnit: "ratio",
    defaultLow: 12.0,
    defaultHigh: 20.0,
    aliases: [
      "bun/creatinine ratio",
      "bun / creatinine ratio",
      "bun/creat ratio",
      "bun / creat ratio",
      "bun/cr ratio",
      "bun to creatinine ratio",
    ],
  },
  {
    canonicalKey: "urea_creatinine_ratio",
    displayName: "Urea / Creatinine Ratio",
    category: "Kidney",
    standardUnit: "ratio",
    defaultLow: 25.68,
    defaultHigh: 42.8,
    aliases: [
      "urea / creatinine ratio",
      "urea/creatinine ratio",
      "urea to creatinine ratio",
    ],
  },
  {
    canonicalKey: "uric_acid",
    displayName: "Uric Acid",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 3.7,
    defaultHigh: 7.7,
    aliases: ["uric acid", "serum uric acid", "urate"],
  },
  {
    canonicalKey: "calcium",
    displayName: "Calcium Serum",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 8.4,
    defaultHigh: 10.2,
    aliases: ["calcium serum", "serum calcium", "calcium", "total calcium", "ca"],
  },
  {
    canonicalKey: "phosphorus",
    displayName: "Phosphorus",
    category: "Kidney",
    standardUnit: "mg/dL",
    defaultLow: 2.3,
    defaultHigh: 4.7,
    aliases: ["phosphorus", "serum phosphorus", "phosphate", "inorganic phosphorus"],
  },
  {
    canonicalKey: "sodium",
    displayName: "Sodium",
    category: "Kidney",
    standardUnit: "mmol/L",
    defaultLow: 136.0,
    defaultHigh: 145.0,
    aliases: ["sodium", "serum sodium", "na"],
  },
  {
    canonicalKey: "potassium",
    displayName: "Potassium",
    category: "Kidney",
    standardUnit: "mmol/L",
    defaultLow: 3.5,
    defaultHigh: 5.1,
    aliases: ["potassium", "serum potassium", "k"],
  },
  {
    canonicalKey: "chloride",
    displayName: "Chloride",
    category: "Kidney",
    standardUnit: "mmol/L",
    defaultLow: 98.0,
    defaultHigh: 107.0,
    aliases: ["chloride", "serum chloride", "cl"],
  },

  // ----------------- Lipid Profile -----------------
  {
    canonicalKey: "cholesterol_total",
    displayName: "Total Cholesterol",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultHigh: 200.0,
    aliases: ["total cholesterol", "cholesterol total", "serum cholesterol", "cholesterol"],
  },
  {
    canonicalKey: "triglycerides",
    displayName: "Triglycerides",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultHigh: 150.0,
    aliases: ["triglycerides", "serum triglycerides", "triglyceride", "tg"],
  },
  {
    canonicalKey: "hdl",
    displayName: "HDL Cholesterol",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultLow: 40.0,
    aliases: ["hdl cholesterol", "cholesterol hdl", "hdl", "hdl-c", "high density lipoprotein"],
  },
  {
    canonicalKey: "non_hdl",
    displayName: "Non HDL Cholesterol",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultHigh: 130.0,
    aliases: ["non hdl cholesterol", "non-hdl cholesterol", "non hdl", "non-hdl", "non hdl-c"],
  },
  {
    canonicalKey: "ldl",
    displayName: "LDL Cholesterol",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultHigh: 100.0,
    aliases: ["ldl cholesterol", "cholesterol ldl", "ldl", "ldl-c", "low density lipoprotein"],
  },
  {
    canonicalKey: "vldl",
    displayName: "V.L.D.L Cholesterol",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultHigh: 30.0,
    aliases: ["v.l.d.l cholesterol", "vldl cholesterol", "vldl", "vldl-c", "very low density lipoprotein"],
  },
  {
    canonicalKey: "chol_hdl_ratio",
    displayName: "Chol/HDL Ratio",
    category: "Lipids",
    standardUnit: "ratio",
    defaultLow: 0.0,
    defaultHigh: 5.0,
    aliases: [
      "chol/hdl ratio",
      "chol / hdl ratio",
      "cholesterol/hdl ratio",
      "total cholesterol / hdl ratio",
      "cholesterol to hdl ratio",
    ],
  },
  {
    canonicalKey: "hdl_ldl_ratio",
    displayName: "HDL/ LDL Ratio",
    category: "Lipids",
    standardUnit: "ratio",
    defaultLow: 0.3,
    defaultHigh: 0.4,
    aliases: ["hdl/ ldl ratio", "hdl/ldl ratio", "hdl / ldl ratio", "hdl to ldl ratio"],
  },
  {
    canonicalKey: "ldl_hdl_ratio",
    displayName: "LDL/HDL Ratio",
    category: "Lipids",
    standardUnit: "ratio",
    defaultLow: 0.0,
    defaultHigh: 3.0,
    aliases: ["ldl/hdl ratio", "ldl / hdl ratio", "ldl to hdl ratio"],
  },

  // ----------------- Thyroid Profile -----------------
  {
    canonicalKey: "t3_total",
    displayName: "Triiodothyronine (T3)",
    category: "Thyroid",
    standardUnit: "ng/dL",
    defaultLow: 35.0,
    defaultHigh: 193.0,
    aliases: [
      "triiodothyronine (t3)",
      "total triiodothyronine",
      "triiodothyronine",
      "t3 total",
      "total t3",
      "t3",
    ],
  },
  {
    canonicalKey: "t4_total",
    displayName: "Total Thyroxine (T4)",
    category: "Thyroid",
    standardUnit: "µg/dL",
    defaultLow: 4.87,
    defaultHigh: 11.72,
    aliases: [
      "total thyroxine (t4)",
      "total thyroxine",
      "thyroxine",
      "t4 total",
      "total t4",
      "t4",
    ],
  },
  {
    canonicalKey: "tsh",
    displayName: "Thyroid Stimulating Hormone (Ultrasensitive)",
    category: "Thyroid",
    standardUnit: "µIU/mL",
    defaultLow: 0.35,
    defaultHigh: 4.94,
    aliases: [
      "thyroid stimulating hormone (ultrasensitive)",
      "thyroid stimulating hormone",
      "tsh",
      "ultrasensitive tsh",
      "thyrotropin",
    ],
  },
  {
    canonicalKey: "free_t3",
    displayName: "Free T3",
    category: "Thyroid",
    standardUnit: "pg/mL",
    defaultLow: 2.0,
    defaultHigh: 4.4,
    aliases: ["free t3", "ft3", "triiodothyronine free"],
  },
  {
    canonicalKey: "free_t4",
    displayName: "Free T4",
    category: "Thyroid",
    standardUnit: "ng/dL",
    defaultLow: 0.8,
    defaultHigh: 1.8,
    aliases: ["free t4", "ft4", "thyroxine free"],
  },

  // ----------------- Vitamins & Iron -----------------
  {
    canonicalKey: "iron_serum",
    displayName: "Iron",
    category: "Vitamins",
    standardUnit: "µg/dL",
    defaultLow: 65.0,
    defaultHigh: 175.0,
    aliases: ["iron", "serum iron", "fe", "iron, total"],
  },
  {
    canonicalKey: "ferritin",
    displayName: "Ferritin",
    category: "Vitamins",
    standardUnit: "ng/mL",
    defaultLow: 30.0,
    defaultHigh: 400.0,
    aliases: ["ferritin", "serum ferritin"],
  },
  {
    canonicalKey: "vitamin_d",
    displayName: "Vitamin D (25-Hydroxy)",
    category: "Vitamins",
    standardUnit: "ng/mL",
    defaultLow: 30.0,
    defaultHigh: 100.0,
    aliases: ["vitamin d, 25-hydroxy", "vitamin d 25-hydroxy", "25-hydroxy vitamin d", "25-oh vitamin d", "vitamin d", "vit d"],
  },
  {
    canonicalKey: "vitamin_b12",
    displayName: "Vitamin B12",
    category: "Vitamins",
    standardUnit: "pg/mL",
    defaultLow: 200.0,
    defaultHigh: 900.0,
    aliases: ["vitamin b12", "vit b12", "cobalamin", "b12"],
  },
  {
    canonicalKey: "folate",
    displayName: "Folate (Vitamin B9)",
    category: "Vitamins",
    standardUnit: "ng/mL",
    defaultLow: 3.0,
    defaultHigh: 20.0,
    aliases: ["folate", "folic acid", "vitamin b9", "serum folate"],
  },
  {
    canonicalKey: "tibc",
    displayName: "Total Iron Binding Capacity (TIBC)",
    category: "Vitamins",
    standardUnit: "ug/dL",
    defaultLow: 250.0,
    defaultHigh: 450.0,
    aliases: ["tibc", "total iron binding capacity"],
  },
  {
    canonicalKey: "transferrin_sat",
    displayName: "Transferrin Saturation",
    category: "Vitamins",
    standardUnit: "%",
    defaultLow: 20.0,
    defaultHigh: 50.0,
    aliases: ["transferrin saturation", "iron saturation", "% transferrin saturation", "tsat"],
  },
  {
    canonicalKey: "apob",
    displayName: "Apolipoprotein B (ApoB)",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultLow: 40.0,
    defaultHigh: 100.0,
    aliases: ["apolipoprotein b", "apo b", "apob"],
  },
  {
    canonicalKey: "apoa1",
    displayName: "Apolipoprotein A1 (ApoA1)",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultLow: 110.0,
    defaultHigh: 205.0,
    aliases: ["apolipoprotein a1", "apo a1", "apoa1", "apo a-1"],
  },
  {
    canonicalKey: "lp_a",
    displayName: "Lipoprotein (a)",
    category: "Lipids",
    standardUnit: "mg/dL",
    defaultLow: 0.0,
    defaultHigh: 30.0,
    aliases: ["lipoprotein (a)", "lipoprotein a", "lp(a)", "lp a"],
  },
  {
    canonicalKey: "anti_tpo",
    displayName: "Thyroid Peroxidase Antibodies (Anti-TPO)",
    category: "Thyroid",
    standardUnit: "IU/mL",
    defaultLow: 0.0,
    defaultHigh: 34.0,
    aliases: ["anti-tpo", "tpo antibodies", "thyroid peroxidase antibodies", "anti tpo"],
  },
  {
    canonicalKey: "anti_tg",
    displayName: "Thyroglobulin Antibodies (Anti-TG)",
    category: "Thyroid",
    standardUnit: "IU/mL",
    defaultLow: 0.0,
    defaultHigh: 4.0,
    aliases: ["anti-tg", "thyroglobulin antibodies", "tg antibodies"],
  },
  {
    canonicalKey: "ldh",
    displayName: "Lactate Dehydrogenase (LDH)",
    category: "Liver",
    standardUnit: "U/L",
    defaultLow: 120.0,
    defaultHigh: 246.0,
    aliases: ["ldh", "lactate dehydrogenase", "lactic dehydrogenase"],
  },
  {
    canonicalKey: "cystatin_c",
    displayName: "Cystatin C",
    category: "Kidney",
    standardUnit: "mg/L",
    defaultLow: 0.5,
    defaultHigh: 1.0,
    aliases: ["cystatin c", "serum cystatin c"],
  },
  {
    canonicalKey: "testosterone_total",
    displayName: "Total Testosterone",
    category: "Hormones",
    standardUnit: "ng/dL",
    defaultLow: 300.0,
    defaultHigh: 1000.0,
    aliases: ["total testosterone", "testosterone, total", "serum testosterone", "testosterone"],
  },
  {
    canonicalKey: "testosterone_free",
    displayName: "Free Testosterone",
    category: "Hormones",
    standardUnit: "pg/mL",
    defaultLow: 9.0,
    defaultHigh: 30.0,
    aliases: ["free testosterone", "testosterone, free", "direct free testosterone"],
  },
  {
    canonicalKey: "estradiol",
    displayName: "Estradiol (E2)",
    category: "Hormones",
    standardUnit: "pg/mL",
    defaultLow: 10.0,
    defaultHigh: 50.0,
    aliases: ["estradiol", "e2", "serum estradiol", "estradiol-17 beta"],
  },
  {
    canonicalKey: "progesterone",
    displayName: "Progesterone",
    category: "Hormones",
    standardUnit: "ng/mL",
    defaultLow: 0.1,
    defaultHigh: 20.0,
    aliases: ["progesterone", "serum progesterone"],
  },
  {
    canonicalKey: "prolactin",
    displayName: "Prolactin",
    category: "Hormones",
    standardUnit: "ng/mL",
    defaultLow: 2.0,
    defaultHigh: 18.0,
    aliases: ["prolactin", "prl", "serum prolactin"],
  },
  {
    canonicalKey: "cortisol_am",
    displayName: "Morning Cortisol (AM)",
    category: "Hormones",
    standardUnit: "ug/dL",
    defaultLow: 6.0,
    defaultHigh: 23.0,
    aliases: ["cortisol am", "morning cortisol", "serum cortisol", "cortisol, total", "cortisol"],
  },
  {
    canonicalKey: "dhea_s",
    displayName: "Dehydroepiandrosterone Sulfate (DHEA-S)",
    category: "Hormones",
    standardUnit: "ug/dL",
    defaultLow: 80.0,
    defaultHigh: 400.0,
    aliases: ["dhea-s", "dhea sulfate", "dheas", "dehydroepiandrosterone sulfate"],
  },
  {
    canonicalKey: "pth",
    displayName: "Parathyroid Hormone (PTH Intact)",
    category: "Hormones",
    standardUnit: "pg/mL",
    defaultLow: 15.0,
    defaultHigh: 65.0,
    aliases: ["pth", "parathyroid hormone", "intact pth", "pth, intact"],
  },
  {
    canonicalKey: "bicarbonate",
    displayName: "Bicarbonate (CO2)",
    category: "Other",
    standardUnit: "mmol/L",
    defaultLow: 22.0,
    defaultHigh: 29.0,
    aliases: ["bicarbonate", "total co2", "carbon dioxide", "hco3", "co2"],
  },
  {
    canonicalKey: "magnesium",
    displayName: "Serum Magnesium",
    category: "Other",
    standardUnit: "mg/dL",
    defaultLow: 1.7,
    defaultHigh: 2.4,
    aliases: ["magnesium", "serum magnesium", "mg++", "serum mg"],
  },
  {
    canonicalKey: "crp",
    displayName: "C-Reactive Protein (hs-CRP)",
    category: "Other",
    standardUnit: "mg/L",
    defaultLow: 0.0,
    defaultHigh: 3.0,
    aliases: ["hs-crp", "c-reactive protein", "high sensitivity crp", "hs crp", "crp"],
  },

  // ----------------- Urine Analysis -----------------
  {
    canonicalKey: "urine_volume",
    displayName: "Volume",
    category: "Other",
    standardUnit: "mL",
    aliases: ["volume", "urine volume"],
  },
  {
    canonicalKey: "urine_color",
    displayName: "Colour",
    category: "Other",
    standardUnit: "",
    aliases: ["colour", "color", "urine colour", "urine color"],
  },
  {
    canonicalKey: "urine_ph",
    displayName: "Reaction (pH)",
    category: "Other",
    standardUnit: "",
    defaultLow: 4.5,
    defaultHigh: 8.0,
    aliases: ["reaction (ph)", "reaction", "ph", "urine reaction (ph)", "urine ph", "urine reaction"],
  },
  {
    canonicalKey: "urine_specific_gravity",
    displayName: "Specific Gravity",
    category: "Other",
    standardUnit: "",
    defaultLow: 1.010,
    defaultHigh: 1.030,
    aliases: ["specific gravity", "urine specific gravity", "sp gravity"],
  },
  {
    canonicalKey: "urine_protein",
    displayName: "Urine Protein (Albumin)",
    category: "Other",
    standardUnit: "",
    aliases: [
      "urine protein (albumin)",
      "urine protein",
      "protein (albumin)",
      "albumin urine",
      "urine albumin",
    ],
  },
  {
    canonicalKey: "urine_ketones",
    displayName: "Urine Ketones (Acetone)",
    category: "Other",
    standardUnit: "",
    aliases: [
      "urine ketones (acetone)",
      "urine ketones",
      "ketones (acetone)",
      "ketone bodies",
      "urine acetone",
    ],
  },
  {
    canonicalKey: "urine_leukocyte_esterase",
    displayName: "Leucocyte esterase",
    category: "Other",
    standardUnit: "",
    aliases: [
      "leucocyte esterase",
      "leukocyte esterase",
      "urine leucocyte esterase",
      "urine leukocyte esterase",
    ],
  },
  {
    canonicalKey: "urine_bilirubin",
    displayName: "Bilirubin Urine",
    category: "Other",
    standardUnit: "",
    aliases: ["bilirubin urine", "urine bilirubin"],
  },
  {
    canonicalKey: "urine_nitrite",
    displayName: "Nitrite",
    category: "Other",
    standardUnit: "",
    aliases: ["nitrite", "urine nitrite"],
  },
  {
    canonicalKey: "urine_urobilinogen",
    displayName: "Urobilinogen",
    category: "Other",
    standardUnit: "",
    aliases: ["urobilinogen", "urine urobilinogen"],
  },
  {
    canonicalKey: "urine_pus_cells",
    displayName: "Pus Cells (WBCs)",
    category: "Other",
    standardUnit: "/hpf",
    defaultLow: 0.0,
    defaultHigh: 5.0,
    aliases: ["pus cells (wbcs)", "pus cells", "urine pus cells", "urine wbcs", "wbcs (urine)"],
  },
  {
    canonicalKey: "urine_epithelial_cells",
    displayName: "Epithelial Cells",
    category: "Other",
    standardUnit: "/hpf",
    defaultLow: 0.0,
    defaultHigh: 4.0,
    aliases: ["epithelial cells", "urine epithelial cells"],
  },
  {
    canonicalKey: "urine_rbc",
    displayName: "Red blood Cells (Urine)",
    category: "Other",
    standardUnit: "/hpf",
    defaultLow: 0.0,
    defaultHigh: 2.0,
    aliases: ["red blood cells (urine)", "red blood cells", "urine rbc", "urine red blood cells", "rbc (urine)"],
  },
  {
    canonicalKey: "urine_crystals",
    displayName: "Crystals",
    category: "Other",
    standardUnit: "",
    aliases: ["crystals", "urine crystals"],
  },
  {
    canonicalKey: "urine_casts",
    displayName: "Cast",
    category: "Other",
    standardUnit: "",
    aliases: ["cast", "casts", "urine cast", "urine casts"],
  },
  {
    canonicalKey: "urine_yeast",
    displayName: "Yeast Cells",
    category: "Other",
    standardUnit: "",
    aliases: ["yeast cells", "yeast", "urine yeast cells"],
  },
  {
    canonicalKey: "urine_amorphous_deposits",
    displayName: "Amorphous deposits",
    category: "Other",
    standardUnit: "",
    aliases: ["amorphous deposits", "urine amorphous deposits"],
  },
  {
    canonicalKey: "urine_bacteria",
    displayName: "Bacteria",
    category: "Other",
    standardUnit: "",
    aliases: ["bacteria", "urine bacteria"],
  },
  {
    canonicalKey: "urine_protozoa",
    displayName: "Protozoa",
    category: "Other",
    standardUnit: "",
    aliases: ["protozoa", "urine protozoa", "parasites"],
  },
];

// Pre-compiled list of all aliases sorted by length descending for token-based matching
interface AliasEntry {
  alias: string;
  cleanedAlias: string;
  metric: MetricDefinitionInternal;
}

const ALL_ALIASES: AliasEntry[] = [];
for (const metric of KNOWN_METRICS) {
  for (const alias of metric.aliases) {
    ALL_ALIASES.push({
      alias: alias.toLowerCase().trim(),
      cleanedAlias: cleanPunctuation(alias),
      metric,
    });
  }
}

// Sort longest alias first (by cleaned alias length, then raw alias length)
ALL_ALIASES.sort((a, b) => b.cleanedAlias.length - a.cleanedAlias.length || b.alias.length - a.alias.length);

/**
 * Normalizes a raw test name using the specified 3-step hierarchy:
 * 1. Exact alias match
 * 2. Punctuation-cleaned match
 * 3. Token-based word-boundary match (longest alias first)
 *
 * Disambiguates based on:
 * - Unit: '%' vs absolute units ('10^3/µl', '/cumm', 'k/ul') separates differential vs absolute counts
 * - Section: Urine sections separate urine tests (protein, glucose, RBC, etc.) from blood tests
 * - Ratios: Disambiguated into specific ratio keys
 *
 * Unknown tests are NOT dropped; returned under "Other" with slugified canonicalKey.
 */
export function normalizeMetric(
  rawName: string,
  unitCell?: string | null,
  section?: string | null,
  parsedUnit?: string | null
): NormalizedMetricResult {
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();
  const cleaned = cleanPunctuation(trimmed);

  const effUnit = (parsedUnit || unitCell || "").toLowerCase().trim();
  const effSection = (section || "").toLowerCase().trim();

  // -------------------------------------------------------------
  // Disambiguation Flags
  // -------------------------------------------------------------
  const isUrineContext =
    /(?:urine|urinalysis|physical examination|visual examination|chemical examination|microscopic examination|peroxidase)/i.test(
      effSection
    ) ||
    /\burine\b/i.test(lower) ||
    /\b(?:urobilinogen|nitrite|leucocyte esterase|leukocyte esterase)\b/i.test(lower);

  const isAbsoluteLeukocyte =
    /(?:absolute)/i.test(effSection) ||
    /(?:10\^?3|10\*3|x10\^?3|\/cumm|k\/ul)/i.test(effUnit) ||
    /\babs(?:olute)?\b/i.test(lower) ||
    trimmed.endsWith(".");

  const isDifferentialLeukocyte =
    /(?:differential)/i.test(effSection) ||
    effUnit === "%" ||
    /\b(?:diff|percent|%)\b/i.test(lower);

  // -------------------------------------------------------------
  // Step A: Context-Specific Direct Resolution (High-Precedence Disambiguation)
  // -------------------------------------------------------------
  if (isUrineContext) {
    // Check known urine metrics first
    for (const entry of ALL_ALIASES) {
      if (entry.metric.canonicalKey.startsWith("urine_")) {
        if (lower === entry.alias || cleaned === entry.cleanedAlias) {
          return {
            canonicalKey: entry.metric.canonicalKey,
            displayName: entry.metric.displayName,
            category: entry.metric.category,
            standardUnit: entry.metric.standardUnit,
            defaultLow: entry.metric.defaultLow,
            defaultHigh: entry.metric.defaultHigh,
            isKnown: true,
          };
        }
      }
    }
    // Sub-phrase for urine
    for (const entry of ALL_ALIASES) {
      if (entry.metric.canonicalKey.startsWith("urine_") && entry.cleanedAlias.length > 2) {
        const regex = new RegExp(`\\b${entry.cleanedAlias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
        if (regex.test(cleaned)) {
          return {
            canonicalKey: entry.metric.canonicalKey,
            displayName: entry.metric.displayName,
            category: entry.metric.category,
            standardUnit: entry.metric.standardUnit,
            defaultLow: entry.metric.defaultLow,
            defaultHigh: entry.metric.defaultHigh,
            isKnown: true,
          };
        }
      }
    }
  }

  // Differential vs Absolute Leukocyte counts
  if (isAbsoluteLeukocyte && !isDifferentialLeukocyte) {
    if (/neutrophil/i.test(lower)) return getKnownMetric("neutrophils_abs");
    if (/lymphocyte/i.test(lower)) return getKnownMetric("lymphocytes_abs");
    if (/monocyte/i.test(lower)) return getKnownMetric("monocytes_abs");
    if (/eosinophil/i.test(lower)) return getKnownMetric("eosinophils_abs");
    if (/basophil/i.test(lower)) return getKnownMetric("basophils_abs");
  } else if (isDifferentialLeukocyte && !isAbsoluteLeukocyte) {
    if (/neutrophil/i.test(lower)) return getKnownMetric("neutrophils_pct");
    if (/lymphocyte/i.test(lower)) return getKnownMetric("lymphocytes_pct");
    if (/monocyte/i.test(lower)) return getKnownMetric("monocytes_pct");
    if (/eosinophil/i.test(lower)) return getKnownMetric("eosinophils_pct");
    if (/basophil/i.test(lower)) return getKnownMetric("basophils_pct");
  }

  // -------------------------------------------------------------
  // Step 1: Exact Alias Match (Case-Insensitive)
  // -------------------------------------------------------------
  for (const entry of ALL_ALIASES) {
    // If not in urine context, skip urine-specific keys
    if (!isUrineContext && entry.metric.canonicalKey.startsWith("urine_")) {
      continue;
    }
    if (lower === entry.alias) {
      return resultFromMetric(entry.metric);
    }
  }

  // -------------------------------------------------------------
  // Step 2: Cleaned Punctuation Match
  // -------------------------------------------------------------
  for (const entry of ALL_ALIASES) {
    if (!isUrineContext && entry.metric.canonicalKey.startsWith("urine_")) {
      continue;
    }
    if (cleaned === entry.cleanedAlias) {
      return resultFromMetric(entry.metric);
    }
  }

  // -------------------------------------------------------------
  // Step 3: Token-Based Word-Boundary Match (Longest Alias First)
  // -------------------------------------------------------------
  for (const entry of ALL_ALIASES) {
    if (!isUrineContext && entry.metric.canonicalKey.startsWith("urine_")) {
      continue;
    }
    if (entry.cleanedAlias.length < 2) continue;

    // Use boundary check on cleaned text
    const escaped = entry.cleanedAlias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(cleaned)) {
      // Disambiguate if matching a leukocyte name
      if (entry.metric.canonicalKey === "neutrophils_pct" && isAbsoluteLeukocyte) {
        return getKnownMetric("neutrophils_abs");
      }
      if (entry.metric.canonicalKey === "lymphocytes_pct" && isAbsoluteLeukocyte) {
        return getKnownMetric("lymphocytes_abs");
      }
      if (entry.metric.canonicalKey === "monocytes_pct" && isAbsoluteLeukocyte) {
        return getKnownMetric("monocytes_abs");
      }
      if (entry.metric.canonicalKey === "eosinophils_pct" && isAbsoluteLeukocyte) {
        return getKnownMetric("eosinophils_abs");
      }
      if (entry.metric.canonicalKey === "basophils_pct" && isAbsoluteLeukocyte) {
        return getKnownMetric("basophils_abs");
      }

      return resultFromMetric(entry.metric);
    }
  }

  // -------------------------------------------------------------
  // Fallback: Unknown Test -> Save under "Other"
  // -------------------------------------------------------------
  const slug = slugify(trimmed);
  return {
    canonicalKey: slug,
    displayName: trimmed,
    category: isUrineContext ? "Other" : "Other",
    standardUnit: parsedUnit || unitCell || "",
    isKnown: false,
  };
}

function resultFromMetric(metric: MetricDefinitionInternal): NormalizedMetricResult {
  return {
    canonicalKey: metric.canonicalKey,
    displayName: metric.displayName,
    category: metric.category,
    standardUnit: metric.standardUnit,
    defaultLow: metric.defaultLow,
    defaultHigh: metric.defaultHigh,
    isKnown: true,
  };
}

function getKnownMetric(key: string): NormalizedMetricResult {
  const m = KNOWN_METRICS.find((k) => k.canonicalKey === key);
  if (m) return resultFromMetric(m);
  return {
    canonicalKey: key,
    displayName: key,
    category: "Other",
    standardUnit: "",
    isKnown: true,
  };
}
