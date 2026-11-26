import { MetricCategory } from "./schema";
import { METRIC_DICTIONARY } from "./metricDictionary";

/**
 * Simple, layman-friendly explanations for every common biomarker.
 * Zero LLM needed — crisp everyday language explaining what the test checks in your body.
 */
const LAYMAN_EXPLANATIONS: Record<string, string> = {
  // Blood (CBC)
  hemoglobin:
    "Carries oxygen from your lungs to the rest of your body. Low levels can make you feel tired or weak.",
  hematocrit:
    "Shows how much of your blood is made up of red blood cells that carry oxygen.",
  rbc: "Counts your oxygen-carrying red blood cells. Too few can cause fatigue; too many can thicken blood.",
  wbc: "Counts your immune cells that fight infections. Levels often rise when your body is fighting germs.",
  platelets:
    "Counts tiny cells that help your blood clot and stop bleeding after a cut or bruise.",
  mcv: "Measures the average size of your red blood cells to help spot causes of anemia or low vitamins.",
  mch: "Checks how much oxygen-carrying hemoglobin is packed inside each red blood cell.",
  mchc: "Shows how concentrated hemoglobin is inside your red blood cells.",
  rdw: "Shows whether your red blood cells are similar in size or vary a lot, which helps explain fatigue.",
  neutrophils:
    "Your body's first-responder white blood cells that rush in to fight bacterial infections.",
  lymphocytes:
    "White blood cells that fight viruses and make antibodies to protect you from getting sick again.",
  monocytes:
    "Clean-up white blood cells that clear out dead cells and stubborn germs.",
  eosinophils:
    "White blood cells that rise during allergies, asthma flare-ups, or certain stomach bugs.",
  basophils:
    "Rare white blood cells involved in allergic reactions and swelling.",
  esr: "Checks for hidden inflammation in your body by seeing how fast red blood cells settle in a tube.",
  mpv: "Measures the average size of your platelets to see how actively your body makes clotting cells.",

  // Lipids
  cholesterol_total:
    "Total amount of cholesterol fats in your blood. Keeping it balanced protects your heart and arteries.",
  ldl: "Often called 'bad' cholesterol because extra amounts can slowly stick inside blood vessel walls.",
  hdl: "Known as 'good' cholesterol because it acts like a cleaner, sweeping extra fats out of your blood.",
  triglycerides:
    "A type of fat in your blood from extra calories and sugar. High levels strain the heart over time.",
  vldl: "A blood fat carrier closely linked to triglycerides that can build up in arteries if too high.",
  non_hdl:
    "Counts all the cholesterol types that can clog arteries (total cholesterol minus your good HDL).",
  chol_hdl_ratio:
    "Compares your total cholesterol to your good HDL to give a quick snapshot of heart health.",
  apob: "Counts the exact number of cholesterol particles that can get stuck in artery walls.",
  apoa1: "Measures the main helpful protein inside your good HDL cholesterol.",
  lp_a: "An inherited type of cholesterol particle that affects heart risk, mostly shaped by your genes.",

  // Sugar & Metabolic
  glucose_fasting:
    "Your blood sugar level after resting overnight without food — the main quick check for diabetes risk.",
  glucose_pp:
    "Shows how well your body clears sugar from your blood 2 hours after eating a meal.",
  glucose_random:
    "A snapshot of your blood sugar at any time of day, regardless of when you last ate.",
  hba1c:
    "Shows your average blood sugar over the last 3 months — like a long-term report card for sugar.",
  insulin_fasting:
    "Measures how much insulin hormone your body needs while fasting to keep blood sugar normal.",
  c_peptide:
    "Shows how much insulin your pancreas is actually making on its own.",
  homa_ir:
    "Estimates whether your body responds easily to insulin or has to work extra hard to control sugar.",

  // Thyroid
  tsh: "Measures the brain signal telling your thyroid gland how fast or slow to run your body's energy.",
  free_t3:
    "The active thyroid hormone floating freely in blood that powers your daily energy and warmth.",
  free_t4:
    "The main thyroid hormone ready to be used by your body to regulate weight, mood, and heartbeat.",
  t3_total:
    "Measures total T3 thyroid hormone in blood, which helps control metabolism and energy speed.",
  t4_total:
    "Measures total T4 thyroid hormone stored and circulating in your blood.",
  anti_tpo:
    "Checks if your immune system is mistakenly irritating your thyroid gland.",
  anti_tg:
    "Looks for immune antibodies targeting your thyroid, often checked alongside thyroid hormone tests.",

  // Liver
  alt: "Checks your liver health. Higher levels usually mean your liver cells are stressed or irritated.",
  ast: "An enzyme mostly in your liver and muscles. Raised levels can point to liver stress or heavy exercise.",
  alp: "Checks bile flow in the liver as well as bone activity.",
  ggt: "A sensitive check for liver bile flow and how your liver handles alcohol or medications.",
  bilirubin_total:
    "A natural yellow pigment cleared by your liver. High levels can cause yellowing of eyes or skin.",
  bilirubin_direct:
    "Measures processed yellow bile pigment ready to leave your liver into digestion.",
  bilirubin_indirect:
    "Measures unprocessed yellow pigment formed when old red blood cells naturally break down.",
  total_protein:
    "Measures the total building-block proteins in blood, reflecting nutrition, liver, and kidney health.",
  albumin:
    "The main blood protein made by your liver; it keeps fluid in blood vessels and carries nutrients.",
  globulin:
    "Blood proteins that carry nutrients and help your immune system fight off infections.",
  ag_ratio:
    "Compares albumin to globulin proteins to help spot liver, kidney, or immune balance issues.",
  ldh: "A general cell-health enzyme that rises when body tissues or muscles are stressed or healing.",

  // Kidney
  creatinine:
    "A normal muscle waste filtered out by your kidneys. Steady levels mean your kidneys are cleaning well.",
  urea: "A natural waste from digesting protein that healthy kidneys filter out into your urine.",
  bun: "Measures leftover protein waste in blood to check how well your kidneys clear waste and hydration.",
  egfr: "Estimates your kidney filtering power as a score — higher numbers mean healthier kidneys.",
  uric_acid:
    "A waste from breaking down certain foods; too much can cause painful joint crystals (gout) or stones.",
  bun_creat_ratio:
    "Compares two kidney waste markers to see if numbers reflect dehydration or kidney filtering itself.",
  cystatin_c:
    "A steady protein check that shows kidney filtering accuracy without being affected by muscle mass.",

  // Vitamins & Minerals
  vitamin_d:
    "The 'sunshine vitamin' that keeps your bones strong, lifts mood, and helps your immune system.",
  vitamin_b12:
    "Vital for steady energy, healthy nerves, memory, and making fresh red blood cells.",
  folate:
    "Vitamin B9, needed to repair cells and make healthy red blood cells every day.",
  ferritin:
    "Shows your body's stored iron tank. Low stores can cause hair fall and tiredness even before anemia.",
  iron_serum:
    "Measures the iron currently riding in your blood to help make oxygen-carrying red blood cells.",
  tibc: "Shows how much room is open in your blood to carry iron — often rises when iron stores are low.",
  transferrin_sat:
    "Shows what percentage of your iron-carrying proteins actually have iron attached right now.",

  // Hormones
  testosterone_total:
    "Main hormone supporting muscle strength, bone density, red blood cells, and daily drive.",
  testosterone_free:
    "The active, unattached testosterone immediately available for your body's tissues to use.",
  estradiol:
    "Key estrogen hormone that supports reproductive health, bones, skin, and mood balance.",
  progesterone:
    "A reproductive hormone that helps regulate menstrual cycles and supports early pregnancy.",
  prolactin:
    "A pituitary hormone mainly responsible for milk production and reproductive hormone balance.",
  cortisol_am:
    "Your morning wake-up and stress hormone that helps control energy, blood pressure, and blood sugar.",
  dhea_s:
    "An adrenal gland hormone that serves as a building block for other male and female hormones.",
  pth: "Controls calcium balance between your bones, kidneys, and gut so nerves and muscles work right.",

  // Other
  calcium:
    "Keeps your bones and teeth strong while helping your nerves, muscles, and heart beat steadily.",
  sodium:
    "Key salt electrolyte that controls your body's water balance, blood pressure, and nerve signals.",
  potassium:
    "Essential mineral that keeps your heartbeat steady and helps your muscles contract smoothly.",
  chloride:
    "An electrolyte that works with sodium to balance fluids and acid levels in your body.",
  bicarbonate:
    "Helps keep your blood's acid-alkali balance steady so your organs work comfortably.",
  magnesium:
    "Supports calm nerves, steady heartbeat, muscle relaxation, sleep, and daily cellular energy.",
  phosphorus:
    "Works alongside calcium to build strong bones and power your body's cells.",
  crp: "Checks for inflammation anywhere in your body, helping flag hidden infections or heart strain.",
};

const CATEGORY_FALLBACKS: Record<MetricCategory, string> = {
  Blood:
    "Checks your blood cells to help spot tiredness, oxygen transport, clotting, or infection signs.",
  Lipids:
    "Checks blood fats and cholesterol balance to help protect your heart and blood vessels.",
  Sugar:
    "Shows how your body handles and processes sugar for steady daily energy.",
  Thyroid:
    "Checks your thyroid gland, which sets the pace for your energy, weight, and body temperature.",
  Liver:
    "Checks how smoothly your liver is cleaning toxins, making proteins, and processing nutrients.",
  Kidney:
    "Checks how effectively your kidneys filter daily waste and balance fluids in your body.",
  Vitamins:
    "Checks essential vitamin or mineral reserves your body needs for energy, nerves, and bones.",
  Hormones:
    "Measures chemical messengers that guide energy, mood, metabolism, and reproductive health.",
  Other:
    "Checks an important body mineral, fluid balance, or general wellness marker in your lab report.",
};

/**
 * Returns an ultra-simple, layman-friendly explanation for ANY biomarker test
 * (using curated explanations, keyword rules for custom/urine/lab tests, and category fallback).
 */
export function getLaymanExplanation(
  metricKey: string,
  displayName?: string,
  category?: MetricCategory
): string {
  if (metricKey && LAYMAN_EXPLANATIONS[metricKey]) {
    return LAYMAN_EXPLANATIONS[metricKey];
  }

  const label = `${metricKey || ""} ${displayName || ""}`.toLowerCase();

  // Heuristic keyword matching for unlisted or custom lab markers (no LLM needed)
  if (label.includes("urine") || label.includes("specific gravity") || label.includes("ketone")) {
    return "Part of your urine check that looks for hydration, kidney filtering, or early signs of sugar or infection.";
  }
  if (label.includes("bilirubin")) {
    return "Measures yellow bile pigment processed by your liver to check liver and bile duct health.";
  }
  if (label.includes("glucose") || label.includes("sugar")) {
    return "Checks the amount of sugar in your sample to see how well your body uses energy.";
  }
  if (label.includes("cholesterol") || label.includes("lipid")) {
    return "Measures fats in your blood to help understand heart and blood vessel health.";
  }
  if (label.includes("thyroid") || label.includes("t3") || label.includes("t4") || label.includes("tsh")) {
    return "Checks your thyroid hormone balance, which controls metabolism and daily energy.";
  }
  if (label.includes("vitamin")) {
    return "Checks whether you have enough of this essential vitamin for energy, immunity, and tissue health.";
  }
  if (label.includes("iron") || label.includes("ferritin") || label.includes("tibc")) {
    return "Checks your body's iron levels, which are needed to carry oxygen and prevent tiredness.";
  }
  if (label.includes("ratio")) {
    return "Compares two related lab values together to give your doctor clearer context on how they balance.";
  }
  if (label.includes("protein") || label.includes("albumin") || label.includes("globulin")) {
    return "Checks key blood proteins that support nutrition, fluid balance, and liver or kidney health.";
  }
  if (label.includes("count") || label.includes("absolute")) {
    return "Counts a specific type of blood cell to help check oxygen delivery, clotting, or immune response.";
  }

  // Fallback to dictionary category or given category
  const resolvedCategory =
    category || METRIC_DICTIONARY[metricKey]?.category || "Other";

  return CATEGORY_FALLBACKS[resolvedCategory] || CATEGORY_FALLBACKS.Other;
}
