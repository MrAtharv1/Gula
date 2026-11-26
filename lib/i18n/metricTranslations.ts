import { MetricCategory } from "@/lib/db/schema";
import {
  METRIC_DICTIONARY,
  resolveCanonicalMetricKey,
} from "@/lib/db/metricDictionary";
import { getLaymanExplanation } from "@/lib/db/laymanExplainer";
import type { AppLanguage } from "./translations";

/**
 * Full localized test display names for all biomarkers in METRIC_DICTIONARY across 12 languages.
 * English ("en") stays exact as default.
 */
const METRIC_NAME_MAP: Record<string, Partial<Record<AppLanguage, string>>> = {
  // 1. Blood (CBC)
  hemoglobin: {
    hi: "हीमोग्लोबिन (Hb)", ta: "ஹீமோகுளோபின் (Hb)", te: "హిమోగ్లోబిన్ (Hb)", kn: "ಹಿಮೋಗ್ಲೋಬಿನ್ (Hb)", ml: "ഹീമോഗ്ലോബിൻ (Hb)", pa: "ਹੀਮੋਗਲੋਬਿਨ (Hb)", mr: "हिमोग्लोबिन (Hb)", fr: "Hémoglobine", de: "Hämoglobin", es: "Hemoglobina", zh: "血红蛋白 (Hb)",
  },
  hematocrit: {
    hi: "हेमाटोक्रिट (HCT / PCV)", ta: "ஹீமாடோக்ரிட் (HCT)", te: "హెమటోక్రిట్ (HCT)", kn: "ಹೆಮಟೋಕ್ರಿಟ್ (HCT)", ml: "ഹെമറ്റോക്രിറ്റ് (HCT)", pa: "ਹੇਮਾਟੋਕ੍ਰਿਟ (HCT)", mr: "हेमॅटोक्रिट (HCT)", fr: "Hématocrite", de: "Hämatokrit", es: "Hematocrito", zh: "红细胞压积 (HCT)",
  },
  rbc: {
    hi: "लाल रक्त कण (RBC)", ta: "சிவப்பு இரத்த அணுக்கள் (RBC)", te: "ఎర్ర రక్త కణాలు (RBC)", kn: "ಕೆಂಪು ರಕ್ತ ಕಣಗಳು (RBC)", ml: "ചുവന്ന രക്താണുക്കൾ (RBC)", pa: "ਲਾਲ ਰਕਤ ਸੈੱਲ (RBC)", mr: "लाल रक्तपेशी (RBC)", fr: "Globules rouges (GR)", de: "Rote Blutkörperchen (RBC)", es: "Glóbulos rojos (RBC)", zh: "红细胞计数 (RBC)",
  },
  wbc: {
    hi: "श्वेत रक्त कण (WBC)", ta: "வெள்ளை இரத்த அணுக்கள் (WBC)", te: "తెల్ల రక్త కణాలు (WBC)", kn: "ಬಿಳಿ ರಕ್ತ ಕಣಗಳು (WBC)", ml: "വെള്ള രക്താണുക്കൾ (WBC)", pa: "ਚਿੱਟੇ ਰਕਤ ਸੈੱਲ (WBC)", mr: "पांढऱ्या रक्तपेशी (WBC)", fr: "Globules blancs (GB)", de: "Weiße Blutkörperchen (WBC)", es: "Glóbulos blancos (WBC)", zh: "白细胞计数 (WBC)",
  },
  platelets: {
    hi: "प्लेटलेट्स (Platelets)", ta: "இரத்தத் தட்டுகள் (Platelets)", te: "ప్లేట్‌లెట్స్ (Platelets)", kn: "ಪ್ಲೇಟ್‌ಲೆಟ್‌ಗಳು (Platelets)", ml: "പ്ലേറ്റ്‌ലെറ്റുകൾ (Platelets)", pa: "ਪਲੇਟਲੈਟਸ (Platelets)", mr: "प्लेटलेट्स (Platelets)", fr: "Plaquettes", de: "Thrombozyten", es: "Plaquetas", zh: "血小板计数 (PLT)",
  },
  mcv: {
    hi: "एमसीवी (MCV - कण आकार)", ta: "MCV (இரத்த அணு அளவு)", te: "MCV (కణ పరిమాణం)", kn: "MCV (ರಕ್ತ ಕಣ ಗಾತ್ರ)", ml: "MCV (കോശ വലിപ്പം)", pa: "MCV (ਸੈੱਲ ਆਕਾਰ)", mr: "MCV (रक्तपेशी आकार)", fr: "VGM (MCV)", de: "MCV (Zellvolumen)", es: "VCM (MCV)", zh: "平均红细胞体积 (MCV)",
  },
  mch: {
    hi: "एमसीएच (MCH)", ta: "MCH", te: "MCH", kn: "MCH", ml: "MCH", pa: "MCH", mr: "MCH", fr: "TCMH (MCH)", de: "MCH", es: "HCM (MCH)", zh: "平均红细胞血红蛋白量 (MCH)",
  },
  mchc: {
    hi: "एमसीएचसी (MCHC)", ta: "MCHC", te: "MCHC", kn: "MCHC", ml: "MCHC", pa: "MCHC", mr: "MCHC", fr: "CCMH (MCHC)", de: "MCHC", es: "CHCM (MCHC)", zh: "平均红细胞血红蛋白浓度 (MCHC)",
  },
  rdw: {
    hi: "आरडीडब्ल्यू (RDW)", ta: "RDW", te: "RDW", kn: "RDW", ml: "RDW", pa: "RDW", mr: "RDW", fr: "Indice de distribution (RDW)", de: "RDW (Erythrozytenverteilung)", es: "ADE (RDW)", zh: "红细胞分布宽度 (RDW)",
  },
  neutrophils: {
    hi: "न्यूट्रोफिल्स (Neutrophils)", ta: "நியூட்ரோபில்கள்", te: "న్యూట్రోఫిల్స్", kn: "ನ್ಯೂಟ್ರೋಫಿಲ್‌ಗಳು", ml: "ന്യൂട്രോഫില്ലുകൾ", pa: "ਨਿਊਟ੍ਰੋਫਿਲਸ", mr: "न्यूट्रोफिल्स", fr: "Neutrophiles", de: "Neutrophile", es: "Neutrófilos", zh: "中性粒细胞 (NEUT)",
  },
  lymphocytes: {
    hi: "लिम्फोसाइट्स (Lymphocytes)", ta: "லிம்போசைட்டுகள்", te: "లింఫోసైట్లు", kn: "ಲಿಂಫೋಸೈಟ್‌ಗಳು", ml: "ലിംഫോസൈറ്റുകൾ", pa: "ਲਿੰਫੋਸਾਈਟਸ", mr: "लिम्फोसाइट्स", fr: "Lymphocytes", de: "Lymphozyten", es: "Linfocitos", zh: "淋巴细胞 (LYMPH)",
  },
  monocytes: {
    hi: "मोनोसाइट्स (Monocytes)", ta: "மோனோசைட்டுகள்", te: "మోనోసైట్లు", kn: "ಮೊನೊಸೈಟ್‌ಗಳು", ml: "മോണോസൈറ്റുകൾ", pa: "ਮੋਨੋਸਾਈਟਸ", mr: "मोनोसाइट्स", fr: "Monocytes", de: "Monozyten", es: "Monocitos", zh: "单核细胞 (MONO)",
  },
  eosinophils: {
    hi: "इओसिनोफिल्स (Eosinophils)", ta: "ஈசினோபில்கள்", te: "ఇసినోఫిల్స్", kn: "ಇಯೋಸಿನೋಫಿಲ್‌ಗಳು", ml: "ഇയോസിനോഫില്ലുകൾ", pa: "ਈਓਸਿਨੋਫਿਲਸ", mr: "इओसिनोफिल्स", fr: "Éosinophiles", de: "Eosinophile", es: "Eosinófilos", zh: "嗜酸性粒细胞 (EOS)",
  },
  basophils: {
    hi: "बेसोफिल्स (Basophils)", ta: "பேசோபில்கள்", te: "బేసోఫిల్స్", kn: "ಬೇಸೋಫಿಲ್‌ಗಳು", ml: "ബേസോഫില്ലുകൾ", pa: "ਬੇਸੋਫਿਲਸ", mr: "बेसोफिल्स", fr: "Basophiles", de: "Basophile", es: "Basófilos", zh: "嗜碱性粒细胞 (BASO)",
  },
  esr: {
    hi: "ईएसआर (ESR - सूजन जांच)", ta: "ESR (வீக்கப் பரிசோதனை)", te: "ESR (వాపు పరీక్ష)", kn: "ESR (ಉರಿಯೂತ ಪರೀಕ್ಷೆ)", ml: "ESR (വീക്കം പരിശോധന)", pa: "ESR (ਸੋਜ ਜਾਂਚ)", mr: "ESR (सूज तपासणी)", fr: "Vitesse de sédimentation (ESR)", de: "Blutsenkung (BSG / ESR)", es: "VSG (ESR)", zh: "血沉 (ESR)",
  },
  mpv: {
    hi: "एमपीवी (MPV)", ta: "MPV", te: "MPV", kn: "MPV", ml: "MPV", pa: "MPV", mr: "MPV", fr: "VPM (MPV)", de: "MPV", es: "VPM (MPV)", zh: "平均血小板体积 (MPV)",
  },

  // 2. Lipids
  cholesterol_total: {
    hi: "कुल कोलेस्ट्रॉल", ta: "மொத்த கொலஸ்ட்ரால்", te: "మొత్తం కొలెస్ట్రాల్", kn: "ಒಟ್ಟು ಕೊಲೆಸ್ಟ್ರಾಲ್", ml: "ആകെ കൊളസ്ട്രോൾ", pa: "ਕੁੱਲ ਕੋਲੈਸਟ੍ਰੋਲ", mr: "एकूण कोलेस्ट्रॉल", fr: "Cholestérol total", de: "Gesamtcholesterin", es: "Colesterol total", zh: "总胆固醇",
  },
  ldl: {
    hi: "एलडीएल कोलेस्ट्रॉल (LDL)", ta: "எல்.டி.எல் கொலஸ்ட்ரால் (LDL)", te: "ఎల్‌డిఎల్ కొలెస్ట్రాల్ (LDL)", kn: "ಎಲ್‌ಡಿಎಲ್ ಕೊಲೆಸ್ಟ್ರಾಲ್ (LDL)", ml: "എൽ.ഡി.എൽ കൊളസ്ട്രോൾ (LDL)", pa: "ਐਲਡੀਐਲ ਕੋਲੈਸਟ੍ਰੋਲ (LDL)", mr: "एलडीएल कोलेस्ट्रॉल (LDL)", fr: "Cholestérol LDL", de: "LDL-Cholesterin", es: "Colesterol LDL", zh: "低密度脂蛋白 (LDL)",
  },
  hdl: {
    hi: "एचडीएल कोलेस्ट्रॉल (HDL)", ta: "எச்.டி.எல் கொலஸ்ட்ரால் (HDL)", te: "హెచ్‌డిఎల్ కొలెస్ట్రాల్ (HDL)", kn: "ಎಚ್‌ಡಿಎಲ್ ಕೊಲೆಸ್ಟ್ರಾಲ್ (HDL)", ml: "എച്ച്.ഡി.എൽ കൊളസ്ട്രോൾ (HDL)", pa: "ਐਚਡੀਐਲ ਕੋਲੈਸਟ੍ਰੋਲ (HDL)", mr: "एचडीएल कोलेस्ट्रॉल (HDL)", fr: "Cholestérol HDL", de: "HDL-Cholesterin", es: "Colesterol HDL", zh: "高密度脂蛋白 (HDL)",
  },
  triglycerides: {
    hi: "ट्राइग्लिसराइड्स (TG)", ta: "ட்ரைகிளிசரைடுகள் (TG)", te: "ట్రైగ్లిజరైడ్స్ (TG)", kn: "ಟ್ರೈಗ್ಲಿಸರೈಡ್ಸ್ (TG)", ml: "ട്രൈഗ്ലിസറൈഡുകൾ (TG)", pa: "ਟ੍ਰਾਈਗਲਿਸਰਾਈਡਸ (TG)", mr: "ट्रायग्लिसराईड्स (TG)", fr: "Triglycérides", de: "Triglyceride", es: "Triglicéridos", zh: "甘油三酯 (TG)",
  },
  vldl: {
    hi: "वीएलडीएल कोलेस्ट्रॉल (VLDL)", ta: "VLDL கொலஸ்ட்ரால்", te: "VLDL కొలెస్ట్రాల్", kn: "VLDL ಕೊಲೆಸ್ಟ್ರಾಲ್", ml: "VLDL കൊളസ്ട്രോൾ", pa: "VLDL ਕੋਲੈਸਟ੍ਰੋਲ", mr: "VLDL कोलेस्ट्रॉल", fr: "Cholestérol VLDL", de: "VLDL-Cholesterin", es: "Colesterol VLDL", zh: "极低密度脂蛋白 (VLDL)",
  },
  non_hdl: {
    hi: "नॉन-एचडीएल कोलेस्ट्रॉल (Non-HDL)", ta: "Non-HDL கொலஸ்ட்ரால்", te: "Non-HDL కొలెస్ట్రాల్", kn: "Non-HDL ಕೊಲೆಸ್ಟ್ರಾಲ್", ml: "Non-HDL കൊളസ്ട്രോൾ", pa: "Non-HDL ਕੋਲੈਸਟ੍ਰੋਲ", mr: "Non-HDL कोलेस्ट्रॉल", fr: "Cholestérol non-HDL", de: "Non-HDL-Cholesterin", es: "Colesterol no HDL", zh: "非高密度脂蛋白 (Non-HDL)",
  },
  chol_hdl_ratio: {
    hi: "कोलेस्ट्रॉल / HDL अनुपात", ta: "கொலஸ்ட்ரால் / HDL விகிதம்", te: "కొలెస్ట్రాల్ / HDL నిష్పత్తి", kn: "ಕೊಲೆಸ್ಟ್ರಾಲ್ / HDL ಅನುಪಾತ", ml: "കൊളസ്ട്രോൾ / HDL അനുപാതം", pa: "ਕੋਲੈਸਟ੍ਰੋਲ / HDL ਅਨੁਪਾਤ", mr: "कोलेस्ट्रॉल / HDL गुणोत्तर", fr: "Rapport Cholestérol / HDL", de: "Cholesterin/HDL-Quotient", es: "Índice Colesterol / HDL", zh: "总胆固醇/HDL比值",
  },
  apob: {
    hi: "एपोलिपोप्रोटीन B (ApoB)", ta: "ApoB", te: "ApoB", kn: "ApoB", ml: "ApoB", pa: "ApoB", mr: "ApoB", fr: "Apolipoprotéine B (ApoB)", de: "Apolipoprotein B (ApoB)", es: "Apolipoproteína B (ApoB)", zh: "载脂蛋白 B (ApoB)",
  },
  apoa1: {
    hi: "एपोलिपोप्रोटीन A1 (ApoA1)", ta: "ApoA1", te: "ApoA1", kn: "ApoA1", ml: "ApoA1", pa: "ApoA1", mr: "ApoA1", fr: "Apolipoprotéine A1 (ApoA1)", de: "Apolipoprotein A1 (ApoA1)", es: "Apolipoproteína A1 (ApoA1)", zh: "载脂蛋白 A1 (ApoA1)",
  },
  lp_a: {
    hi: "लिपोप्रोटीन (a)", ta: "Lipoprotein (a)", te: "Lipoprotein (a)", kn: "Lipoprotein (a)", ml: "Lipoprotein (a)", pa: "Lipoprotein (a)", mr: "Lipoprotein (a)", fr: "Lipoprotéine (a)", de: "Lipoprotein (a)", es: "Lipoproteína (a)", zh: "脂蛋白(a) [Lp(a)]",
  },

  // 3. Sugar & Metabolic
  glucose_fasting: {
    hi: "खाली पेट ब्लड शुगर", ta: "உணவுக்கு முன் சர்க்கரை", te: "ఉపవాస రక్త చక్కెర", kn: "ಉಪವಾಸದ ರಕ್ತದ ಸಕ್ಕರೆ", ml: "ഉപവാസ രക്തത്തിലെ പഞ്ചസാര", pa: "ਖਾਲੀ ਪੇਟ ਸ਼ੂਗਰ", mr: "रिकाम्या पोटी रक्तातील साखर", fr: "Glycémie à jeun", de: "Nüchternblutzucker", es: "Glucosa en ayunas", zh: "空腹血糖",
  },
  glucose_pp: {
    hi: "भोजन के बाद शुगर (PP)", ta: "உணவுக்குப் பின் சர்க்கரை (PP)", te: "భోజనం తర్వాత చక్కెర (PP)", kn: "ಊಟದ ನಂತರದ ಸಕ್ಕರೆ (PP)", ml: "ഭക്ഷണത്തിന് ശേഷമുള്ള പഞ്ചസാര", pa: "ਭੋਜਨ ਤੋਂ ਬਾਅਦ ਸ਼ੂਗਰ (PP)", mr: "जेवणानंतरची साखर (PP)", fr: "Glycémie postprandiale", de: "Blutzucker nach dem Essen", es: "Glucosa posprandial", zh: "餐后血糖",
  },
  glucose_random: {
    hi: "रैंडम ब्लड शुगर", ta: "சாதாரண நேர சர்க்கரை", te: "యాదృచ్ఛిక రక్త చక్కెర", kn: "ಯಾದೃಚ್ಛಿಕ ರಕ್ತದ ಸಕ್ಕರೆ", ml: "റാൻഡം ബ്ലഡ് ഷുഗർ", pa: "ਰੈਂਡਮ ਬਲੱਡ ਸ਼ੂਗਰ", mr: "रँडम ब्लड शुगर", fr: "Glycémie aléatoire", de: "Gelegenheitsblutzucker", es: "Glucosa aleatoria", zh: "随机血糖",
  },
  hba1c: {
    hi: "HbA1c (3 माह औसत शुगर)", ta: "HbA1c (3 மாத சராசரி சர்க்கரை)", te: "HbA1c (3 నెలల సగటు చక్కెర)", kn: "HbA1c (3 ತಿಂಗಳ ಸರಾಸರಿ ಸಕ್ಕರೆ)", ml: "HbA1c (3 മാസത്തെ ശരാശരി)", pa: "HbA1c (3 ਮਹੀਨੇ ਦੀ ਔਸਤ ਸ਼ੂਗਰ)", mr: "HbA1c (3 महिन्यांची सरासरी साखर)", fr: "Hémoglobine glyquée (HbA1c)", de: "Langzeitzucker (HbA1c)", es: "Hemoglobina glucosilada (HbA1c)", zh: "糖化血红蛋白 (HbA1c)",
  },
  insulin_fasting: {
    hi: "खाली पेट इंसुलिन (Insulin)", ta: "உணவுக்கு முன் இன்சுலின்", te: "ఫాస్టింగ్ ఇన్సులిన్", kn: "ಫಾಸ್ಟಿಂಗ್ ಇನ್ಸುಲಿನ್", ml: "ഫാസ്റ്റിംഗ് ഇൻസുലിൻ", pa: "ਫਾਸਟਿੰਗ ਇਨਸੁਲਿਨ", mr: "फास्टिंग इन्सुलिन", fr: "Insuline à jeun", de: "Nüchterninsulin", es: "Insulina en ayunas", zh: "空腹胰岛素",
  },
  c_peptide: {
    hi: "सी-पेप्टाइड (C-Peptide)", ta: "சி-பெப்டைட் (C-Peptide)", te: "సి-పెప్టైడ్ (C-Peptide)", kn: "ಸಿ-ಪೆಪ್ಟೈಡ್ (C-Peptide)", ml: "സി-പെപ്റ്റൈഡ് (C-Peptide)", pa: "ਸੀ-ਪੇਪਟਾਈਡ (C-Peptide)", mr: "सी-पेप्टाइड (C-Peptide)", fr: "Peptide C", de: "C-Peptid", es: "Péptido C", zh: "C肽 (C-Peptide)",
  },
  homa_ir: {
    hi: "होमा-आईआर (इंसुलिन प्रतिरोध)", ta: "HOMA-IR", te: "HOMA-IR", kn: "HOMA-IR", ml: "HOMA-IR", pa: "HOMA-IR", mr: "HOMA-IR", fr: "Indice HOMA-IR", de: "HOMA-IR-Index", es: "Índice HOMA-IR", zh: "胰岛素抵抗指数 (HOMA-IR)",
  },

  // 4. Thyroid
  tsh: {
    hi: "थायरॉइड टीएसएच (TSH)", ta: "தைராய்டு TSH", te: "థైరాయిడ్ TSH", kn: "ಥೈರಾಯ್ಡ್ TSH", ml: "തൈറോയ്ഡ് TSH", pa: "ਥਾਇਰਾਇਡ TSH", mr: "थायरॉईड TSH", fr: "TSH", de: "TSH (Schilddrüse)", es: "TSH", zh: "促甲状腺激素 (TSH)",
  },
  free_t3: {
    hi: "फ्री टी3 (Free T3)", ta: "ஃப்ரீ T3 (Free T3)", te: "ఫ్రీ T3 (Free T3)", kn: "ಫ್ರೀ T3 (Free T3)", ml: "ഫ്രീ T3 (Free T3)", pa: "ਫ੍ਰੀ T3 (Free T3)", mr: "फ्री T3 (Free T3)", fr: "T3 libre (FT3)", de: "Freies T3 (fT3)", es: "T3 libre", zh: "游离三碘甲状腺原氨酸 (FT3)",
  },
  free_t4: {
    hi: "फ्री टी4 (Free T4)", ta: "ஃப்ரீ T4 (Free T4)", te: "ఫ్రీ T4 (Free T4)", kn: "ಫ್ರೀ T4 (Free T4)", ml: "ഫ്രീ T4 (Free T4)", pa: "ਫ੍ਰੀ T4 (Free T4)", mr: "फ्री T4 (Free T4)", fr: "T4 libre (FT4)", de: "Freies T4 (fT4)", es: "T4 libre", zh: "游离甲状腺素 (FT4)",
  },
  t3_total: {
    hi: "कुल टी3 (Total T3)", ta: "மொத்த T3", te: "మొత్తం T3", kn: "ಒಟ್ಟು T3", ml: "ആകെ T3", pa: "ਕੁੱਲ T3", mr: "एकूण T3", fr: "T3 totale", de: "Gesamt-T3", es: "T3 total", zh: "总三碘甲状腺原氨酸 (T3)",
  },
  t4_total: {
    hi: "कुल टी4 (Total T4)", ta: "மொத்த T4", te: "మొత్తం T4", kn: "ಒಟ್ಟು T4", ml: "ആകെ T4", pa: "ਕੁੱਲ T4", mr: "एकूण T4", fr: "T4 totale", de: "Gesamt-T4", es: "T4 total", zh: "总甲状腺素 (T4)",
  },
  anti_tpo: {
    hi: "एंटी-टीपीओ एंटीबॉडी (Anti-TPO)", ta: "Anti-TPO ஆன்டிபாடி", te: "Anti-TPO యాంటీబాడీ", kn: "Anti-TPO ಪ್ರತಿಕಾಯ", ml: "Anti-TPO ആന്റിബോഡി", pa: "Anti-TPO ਐਂਟੀਬਾਡੀ", mr: "Anti-TPO अँटीबॉडी", fr: "Anticorps anti-TPO", de: "TPO-Antikörper", es: "Anticuerpos anti-TPO", zh: "抗甲状腺过氧化物酶抗体 (Anti-TPO)",
  },
  anti_tg: {
    hi: "एंटी-टीजी एंटीबॉडी (Anti-TG)", ta: "Anti-TG ஆன்டிபாடி", te: "Anti-TG యాంటీబాడీ", kn: "Anti-TG ಪ್ರತಿಕಾಯ", ml: "Anti-TG ആന്റിബോഡി", pa: "Anti-TG ਐਂਟੀਬਾਡੀ", mr: "Anti-TG अँटीबॉडी", fr: "Anticorps anti-TG", de: "Thyreoglobulin-Antikörper", es: "Anticuerpos anti-TG", zh: "抗甲状腺球蛋白抗体 (Anti-TG)",
  },

  // 5. Liver
  alt: {
    hi: "ALT / SGPT (लिवर एंजाइम)", ta: "ALT / SGPT (கல்லீரல்)", te: "ALT / SGPT (లివర్)", kn: "ALT / SGPT (ಲಿವರ್)", ml: "ALT / SGPT (കരൾ)", pa: "ALT / SGPT (ਲਿਵਰ)", mr: "ALT / SGPT (यकृत)", fr: "ALAT (SGPT)", de: "ALT / GPT", es: "ALT / GPT", zh: "谷丙转氨酶 (ALT)",
  },
  ast: {
    hi: "AST / SGOT (एंजाइम)", ta: "AST / SGOT", te: "AST / SGOT", kn: "AST / SGOT", ml: "AST / SGOT", pa: "AST / SGOT", mr: "AST / SGOT", fr: "ASAT (SGOT)", de: "AST / GOT", es: "AST / GOT", zh: "谷草转氨酶 (AST)",
  },
  alp: {
    hi: "अल्कलाइन फॉस्फेटेज (ALP)", ta: "ALP (கல்லீரல்/எலும்பு)", te: "ALP (ఆల్కలైన్ ఫాస్ఫటేజ్)", kn: "ALP (ಆಲ್ಕಲೈನ್ ಫಾಸ್ಫಟೇಸ್)", ml: "ALP (ആൽക്കലൈൻ ഫോസ്ഫറ്റേസ്)", pa: "ALP", mr: "ALP", fr: "Phosphatases alcalines (PAL)", de: "Alkalische Phosphatase (AP)", es: "Fosfatasa alcalina (FA)", zh: "碱性磷酸酶 (ALP)",
  },
  ggt: {
    hi: "जीजीटी (GGT)", ta: "GGT", te: "GGT", kn: "GGT", ml: "GGT", pa: "GGT", mr: "GGT", fr: "Gamma-GT (GGT)", de: "Gamma-GT (GGT)", es: "GGT", zh: "谷氨酰转肽酶 (GGT)",
  },
  bilirubin_total: {
    hi: "कुल बिलीरुबिन (Bilirubin)", ta: "மொத்த பிலிரூபின்", te: "మొత్తం బిలిరుబిన్", kn: "ಒಟ್ಟು ಬಿಲಿರುಬಿನ್", ml: "ആകെ ബിലിറൂബിൻ", pa: "ਕੁੱਲ ਬਿਲੀਰੂਬਿਨ", mr: "एकूण बिलीरुबिन", fr: "Bilirubine totale", de: "Gesamtbilirubin", es: "Bilirrubina total", zh: "总胆红素",
  },
  bilirubin_direct: {
    hi: "डायरेक्ट बिलीरुबिन", ta: "நேரடி பிலிரூபின்", te: "డైరెక్ట్ బిలిరుబిన్", kn: "ಡೈರೆಕ್ಟ್ ಬಿಲಿರುಬಿನ್", ml: "ഡയറക്ട് ബിലിറൂബിൻ", pa: "ਡਾਇਰੈਕਟ ਬਿਲੀਰੂਬਿਨ", mr: "डायरेक्ट बिलीरुबिन", fr: "Bilirubine directe", de: "Direktes Bilirubin", es: "Bilirrubina directa", zh: "直接胆红素",
  },
  bilirubin_indirect: {
    hi: "इनडायरेक्ट बिलीरुबिन", ta: "மறைமுக பிலிரூபின்", te: "ఇన్‌డైరెక్ట్ బిలిరుబిన్", kn: "ಇನ್‌ಡೈರೆಕ್ಟ್ ಬಿಲಿರುಬಿನ್", ml: "ഇൻഡയറക്ട് ബിലിറൂബിൻ", pa: "ਇਨਡਾਇਰੈਕਟ ਬਿਲੀਰੂਬਿਨ", mr: "इनडायरेक्ट बिलीरुबिन", fr: "Bilirubine indirecte", de: "Indirektes Bilirubin", es: "Bilirrubina indirecta", zh: "间接胆红素",
  },
  total_protein: {
    hi: "कुल प्रोटीन (Total Protein)", ta: "மொத்த புரதம்", te: "మొత్తం ప్రోటీన్", kn: "ಒಟ್ಟು ಪ್ರೋಟೀನ್", ml: "ആകെ പ്രോട്ടീൻ", pa: "ਕੁੱਲ ਪ੍ਰੋਟੀਨ", mr: "एकूण प्रथिने", fr: "Protéines totales", de: "Gesamteiweiß", es: "Proteínas totales", zh: "总蛋白",
  },
  albumin: {
    hi: "एल्ब्यूमिन (Albumin)", ta: "அல்புமின் (Albumin)", te: "అల్బుమిన్ (Albumin)", kn: "ಅಲ್ಬುಮಿನ್ (Albumin)", ml: "ആൽബുമിൻ (Albumin)", pa: "ਐਲਬਿਊਮਿਨ (Albumin)", mr: "अल्ब्युमिन (Albumin)", fr: "Albumine", de: "Albumin", es: "Albúmina", zh: "白蛋白 (Albumin)",
  },
  globulin: {
    hi: "ग्लोब्युलिन (Globulin)", ta: "குளோபுலின் (Globulin)", te: "గ్లోబులిన్ (Globulin)", kn: "ಗ್ಲೋಬ್ಯುಲಿನ್ (Globulin)", ml: "ഗ്ലോബുലിൻ (Globulin)", pa: "ਗਲੋਬਿਊਲਿਨ (Globulin)", mr: "ग्लोब्युलिन (Globulin)", fr: "Globulines", de: "Globulin", es: "Globulina", zh: "球蛋白 (Globulin)",
  },
  ag_ratio: {
    hi: "एल्ब्यूमिन / ग्लोब्युलिन अनुपात (A/G)", ta: "A/G விகிதம்", te: "A/G నిష్పత్తి", kn: "A/G ಅನುಪಾತ", ml: "A/G അനുപാതം", pa: "A/G ਅਨੁਪਾਤ", mr: "A/G गुणोत्तर", fr: "Rapport A/G", de: "Albumin/Globulin-Quotient", es: "Relación A/G", zh: "白球比 (A/G)",
  },
  ldh: {
    hi: "एलडीएच (LDH)", ta: "LDH", te: "LDH", kn: "LDH", ml: "LDH", pa: "LDH", mr: "LDH", fr: "LDH", de: "LDH", es: "LDH", zh: "乳酸脱氢酶 (LDH)",
  },

  // 6. Kidney
  creatinine: {
    hi: "सीरम क्रिएटिनिन (Creatinine)", ta: "கிரியேட்டினின்", te: "క్రియాటినిన్", kn: "ಕ್ರಿಯೇಟಿನಿನ್", ml: "ക്രിയാറ്റിനിൻ", pa: "ਕ੍ਰਿਏਟਿਨਿਨ", mr: "क्रिएटिनिन", fr: "Créatinine sérique", de: "Serum-Kreatinin", es: "Creatinina sérica", zh: "血肌酐 (Creatinine)",
  },
  urea: {
    hi: "ब्लड यूरिया (Urea)", ta: "இரத்த யூரியா", te: "రక్త యూరియా", kn: "ರಕ್ತದ ಯೂರಿಯಾ", ml: "രക്തത്തിലെ യൂറിയ", pa: "ਬਲੱਡ ਯੂਰੀਆ", mr: "रक्तातील युरिया", fr: "Urée sanguine", de: "Harnstoff", es: "Urea en sangre", zh: "血尿素",
  },
  bun: {
    hi: "ब्लड यूरिया नाइट्रोजन (BUN)", ta: "BUN (யூரியா நைட்ரஜன்)", te: "BUN (యూరియా నైట్రోజన్)", kn: "BUN", ml: "BUN", pa: "BUN", mr: "BUN", fr: "Azote uréique (BUN)", de: "Harnstoff-Stickstoff (BUN)", es: "Nitrógeno ureico (BUN)", zh: "血尿素氮 (BUN)",
  },
  egfr: {
    hi: "eGFR (किडनी फ़िल्टर दर)", ta: "eGFR (சிறுநீரக வடிகட்டுதல்)", te: "eGFR (కిడ్నీ వడపోత)", kn: "eGFR (ಕಿಡ್ನಿ ಫಿಲ್ಟರ್)", ml: "eGFR (വൃക്ക ഫിൽട്ടർ)", pa: "eGFR (ਕਿਡਨੀ ਫਿਲਟਰ)", mr: "eGFR (मूत्रपिंड गाळण दर)", fr: "DFG estimé (eGFR)", de: "Geschätzte GFR (eGFR)", es: "TFG estimada (eGFR)", zh: "估算肾小球滤过率 (eGFR)",
  },
  uric_acid: {
    hi: "यूरिक एसिड (Uric Acid)", ta: "யூரிக் அமிலம்", te: "యూరిక్ యాసిడ్", kn: "ಯೂರಿಕ್ ಆಸಿಡ್", ml: "യൂറിക് ആസിഡ്", pa: "ਯੂਰਿਕ ਐਸਿਡ", mr: "यूरिक अ‍ॅसिड", fr: "Acide urique", de: "Harnsäure", es: "Ácido úrico", zh: "尿酸",
  },
  bun_creat_ratio: {
    hi: "BUN / क्रिएटिनिन अनुपात", ta: "BUN / கிரியேட்டினின் விகிதம்", te: "BUN / క్రియాటినిన్ నిష్పత్తి", kn: "BUN / ಕ್ರಿಯೇಟಿನಿನ್ ಅನುಪಾತ", ml: "BUN / ക്രിയാറ്റിനിൻ അനുപാതം", pa: "BUN / ਕ੍ਰਿਏਟਿਨਿਨ ਅਨੁਪਾਤ", mr: "BUN / क्रिएटिनिन गुणोत्तर", fr: "Rapport Urée / Créatinine", de: "BUN/Kreatinin-Quotient", es: "Relación BUN / Creatinina", zh: "尿素氮/肌酐比值",
  },
  cystatin_c: {
    hi: "सिस्टैटिन C (Cystatin C)", ta: "Cystatin C", te: "Cystatin C", kn: "Cystatin C", ml: "Cystatin C", pa: "Cystatin C", mr: "Cystatin C", fr: "Cystatine C", de: "Cystatin C", es: "Cistatina C", zh: "胱抑素 C (Cystatin C)",
  },

  // 7. Vitamins & Iron
  vitamin_d: {
    hi: "विटामिन डी (Vitamin D)", ta: "வைட்டமின் டி", te: "విటమిన్ డి", kn: "ವಿಟಮಿನ್ ಡಿ", ml: "വിറ്റാമിൻ ഡി", pa: "ਵਿਟਾਮਿਨ ਡੀ", mr: "व्हिटॅमिन डी", fr: "Vitamine D (25-OH)", de: "Vitamin D (25-OH)", es: "Vitamina D (25-OH)", zh: "维生素 D",
  },
  vitamin_b12: {
    hi: "विटामिन B12", ta: "வைட்டமின் B12", te: "విటమిన్ B12", kn: "ವಿಟಮಿನ್ B12", ml: "വിറ്റാമിൻ B12", pa: "ਵਿਟਾਮਿਨ B12", mr: "व्हिटॅमिन B12", fr: "Vitamine B12", de: "Vitamin B12", es: "Vitamina B12", zh: "维生素 B12",
  },
  folate: {
    hi: "फोलेट (विटामिन B9)", ta: "ஃபோலேட் (B9)", te: "ఫోలేట్ (B9)", kn: "ಫೋಲೇಟ್ (B9)", ml: "ഫോളേറ്റ് (B9)", pa: "ਫੋਲੇਟ (B9)", mr: "फोलेट (B9)", fr: "Folates (Vitamine B9)", de: "Folsäure (Vitamin B9)", es: "Ácido fólico (B9)", zh: "叶酸 (维生素 B9)",
  },
  ferritin: {
    hi: "फेरिटिन (आयरन भंडार)", ta: "ஃபெரிட்டின் (இரும்புச்சத்து)", te: "ఫెరిటిన్ (ఐరన్ నిల్వ)", kn: "ಫೆರಿಟಿನ್ (ಕಬ್ಬಿಣ)", ml: "ഫെറിറ്റിൻ (ഇരുമ്പ്)", pa: "ਫੇਰਿਟਿਨ (ਆਇਰਨ)", mr: "फेरिटिन (लोह साठा)", fr: "Ferritine", de: "Ferritin", es: "Ferritina", zh: "铁蛋白 (Ferritin)",
  },
  iron_serum: {
    hi: "सीरम आयरन (लोहा)", ta: "சீரம் இரும்புச்சத்து", te: "సీరం ఐరన్", kn: "ಸೀರಮ್ ಕಬ್ಬಿಣ", ml: "സീറം അയേൺ", pa: "ਸੀਰਮ ਆਇਰਨ", mr: "सीरम लोह", fr: "Fer sérique", de: "Serum-Eisen", es: "Hierro sérico", zh: "血清铁",
  },
  tibc: {
    hi: "टीआईबीसी (TIBC)", ta: "TIBC", te: "TIBC", kn: "TIBC", ml: "TIBC", pa: "TIBC", mr: "TIBC", fr: "Capacité totale (TIBC)", de: "Eisenbindungskapazität (TIBC)", es: "TIBC", zh: "总铁结合力 (TIBC)",
  },
  transferrin_sat: {
    hi: "ट्रांसफरिन सैचुरेशन (%)", ta: "டிரான்ஸ்ஃபெரின் செறிவு", te: "ట్రాన్స్‌ఫెరిన్ సంతృప్తత", kn: "ಟ್ರಾನ್ಸ್‌ಫೆರಿನ್ ಸ್ಯಾಚುರೇಶನ್", ml: "ട്രാൻസ്ഫെറിൻ സാച്ചുറേഷൻ", pa: "ਟ੍ਰਾਂਸਫੇਰਿਨ ਸੈਚੁਰੇਸ਼ਨ", mr: "ट्रान्सफरिन सॅचुरेशन", fr: "Saturation de la transferrine", de: "Transferrinsättigung", es: "Saturación de transferrina", zh: "转铁蛋白饱和度",
  },

  // 8. Hormones
  testosterone_total: {
    hi: "कुल टेस्टोस्टेरोन", ta: "டெஸ்டோஸ்டிரோன்", te: "టెస్టోస్టెరాన్", kn: "ಟೆಸ್ಟೋಸ್ಟೆರಾನ್", ml: "ടെസ്റ്റോസ്റ്റിറോൺ", pa: "ਟੈਸਟੋਸਟੇਰੋਨ", mr: "टेस्टोस्टेरॉन", fr: "Testostérone totale", de: "Gesamttestosteron", es: "Testosterona total", zh: "总睾酮",
  },
  testosterone_free: {
    hi: "फ्री टेस्टोस्टेरोन", ta: "ஃப்ரீ டெஸ்டோஸ்டிரோன்", te: "ఫ్రీ టెస్టోస్టెరాన్", kn: "ಫ್ರೀ ಟೆಸ್ಟೋಸ್ಟೆರಾನ್", ml: "ഫ്രീ ടെസ്റ്റോസ്റ്റിറോൺ", pa: "ਫ੍ਰੀ ਟੈਸਟੋਸਟੇਰੋਨ", mr: "फ्री टेस्टोस्टेरॉन", fr: "Testostérone libre", de: "Freies Testosteron", es: "Testosterona libre", zh: "游离睾酮",
  },
  estradiol: {
    hi: "एस्ट्राडियोल (E2)", ta: "எஸ்ட்ராடியோல் (E2)", te: "ఎస్త్రాడియోల్ (E2)", kn: "ಎಸ್ಟ್ರಾಡಿಯೋಲ್ (E2)", ml: "എസ്ട്രാഡിയോൾ (E2)", pa: "ਐਸਟ੍ਰਾਡੀਓਲ (E2)", mr: "एस्ट्राडिओल (E2)", fr: "Œstradiol (E2)", de: "Östradiol (E2)", es: "Estradiol (E2)", zh: "雌二醇 (E2)",
  },
  progesterone: {
    hi: "प्रोजेस्टेरोन", ta: "புரோஜெஸ்டிரோன்", te: "ప్రొజెస్టెరాన్", kn: "ಪ್ರೊಜೆಸ್ಟರಾನ್", ml: "പ്രൊജസ്റ്ററോൺ", pa: "ਪ੍ਰੋਜੇਸਟੇਰੋਨ", mr: "प्रोजेस्टेरॉन", fr: "Progestérone", de: "Progesteron", es: "Progesterona", zh: "孕酮 (黄体酮)",
  },
  prolactin: {
    hi: "प्रोलैक्टिन (Prolactin)", ta: "புரோலாக்டின்", te: "ప్రోలాక్టిన్", kn: "ಪ್ರೋಲ್ಯಾಕ್ಟಿನ್", ml: "പ്രൊലാക്റ്റിൻ", pa: "ਪ੍ਰੋਲੈਕਟਿਨ", mr: "प्रोलॅक्टिन", fr: "Prolactine", de: "Prolaktin", es: "Prolactina", zh: "泌乳素 (PRL)",
  },
  cortisol_am: {
    hi: "सुबह का कोर्टिसोल (AM)", ta: "காலை கார்டிசோல்", te: "ఉదయపు కార్టిసాల్", kn: "ಬೆಳಗಿನ ಕಾರ್ಟಿಸೋಲ್", ml: "രാവിലെ കോർട്ടിസോൾ", pa: "ਸਵੇਰ ਦਾ ਕੋਰਟੀਸੋਲ", mr: "सकाळचा कॉर्टिसोल", fr: "Cortisol matin", de: "Cortisol (morgens)", es: "Cortisol matutino", zh: "皮质醇 (晨间)",
  },
  dhea_s: {
    hi: "डीएचईए-सल्फेट (DHEA-S)", ta: "DHEA-S", te: "DHEA-S", kn: "DHEA-S", ml: "DHEA-S", pa: "DHEA-S", mr: "DHEA-S", fr: "Sulfate de DHEA", de: "DHEA-Sulfat", es: "DHEA-Sulfato", zh: "硫酸脱氢表雄酮 (DHEA-S)",
  },
  pth: {
    hi: "पैराथायरॉइड हार्मोन (PTH)", ta: "PTH ஹார்மோன்", te: "PTH హార్మోన్", kn: "PTH ಹಾರ್ಮೋನ್", ml: "PTH ഹോർമോൺ", pa: "PTH ਹਾਰਮੋਨ", mr: "PTH हार्मोन", fr: "Parathormone (PTH)", de: "Parathormon (PTH)", es: "Hormona paratiroidea (PTH)", zh: "甲状旁腺激素 (PTH)",
  },

  // 9. Other (Electrolytes & Inflammation)
  calcium: {
    hi: "सीरम कैल्शियम (Calcium)", ta: "கால்சியம்", te: "కాల్షియం", kn: "ಕ್ಯಾಲ್ಸಿಯಂ", ml: "കാൽസ്യം", pa: "ਕੈਲਸ਼ੀਅਮ", mr: "कॅल्शियम", fr: "Calcium sérique", de: "Serum-Kalzium", es: "Calcio sérico", zh: "血钙 (Calcium)",
  },
  sodium: {
    hi: "सीरम सोडियम (Sodium)", ta: "சோடியம்", te: "సోడియం", kn: "ಸೋಡಿಯಂ", ml: "സോഡിയം", pa: "ਸੋਡੀਅਮ", mr: "सोडियम", fr: "Sodium sérique", de: "Serum-Natrium", es: "Sodio sérico", zh: "血钠 (Na)",
  },
  potassium: {
    hi: "सीरम पोटेशियम (Potassium)", ta: "பொட்டாசியம்", te: "పొటాషియం", kn: "ಪೊಟ್ಯಾಸಿಯಮ್", ml: "പൊട്ടാസ്യം", pa: "ਪੋਟਾਸ਼ੀਅਮ", mr: "पोटॅशियम", fr: "Potassium sérique", de: "Serum-Kalium", es: "Potasio sérico", zh: "血钾 (K)",
  },
  chloride: {
    hi: "सीरम क्लोराइड (Chloride)", ta: "குளோரைடு", te: "క్లోరైడ్", kn: "ಕ್ಲೋರೈಡ್", ml: "ക്ലോറൈഡ്", pa: "ਕਲੋਰਾਇਡ", mr: "क्लोराइड", fr: "Chlorures sériques", de: "Serum-Chlorid", es: "Cloruro sérico", zh: "血氯 (Cl)",
  },
  bicarbonate: {
    hi: "बाइकार्बोनेट (CO2)", ta: "பைகார்பனேட் (CO2)", te: "బైకార్బొనేట్ (CO2)", kn: "ಬೈಕಾರ್ಬನೇಟ್ (CO2)", ml: "ബൈകാർബണേറ്റ് (CO2)", pa: "ਬਾਈਕਾਰਬੋਨੇਟ (CO2)", mr: "बायकार्बोनेट (CO2)", fr: "Bicarbonates (CO2)", de: "Bikarbonat (CO2)", es: "Bicarbonato (CO2)", zh: "碳酸氢盐 (CO2)",
  },
  magnesium: {
    hi: "सीरम मैग्नीशियम (Magnesium)", ta: "மெக்னீசியம்", te: "మెగ్నీషియం", kn: "ಮೆಗ್ನೀಸಿಯಮ್", ml: "മഗ്നീഷ്യം", pa: "ਮੈਗਨੀਸ਼ੀਅਮ", mr: "मॅग्नेशियम", fr: "Magnésium sérique", de: "Serum-Magnesium", es: "Magnesio sérico", zh: "血镁 (Mg)",
  },
  phosphorus: {
    hi: "सीरम फॉस्फोरस (Phosphorus)", ta: "பாஸ்பரஸ்", te: "ఫాస్ఫరస్", kn: "ರಂಜಕ (Phosphorus)", ml: "ഫോസ്ഫറസ്", pa: "ਫਾਸਫੋਰਸ", mr: "फॉस्फरस", fr: "Phosphore sérique", de: "Serum-Phosphat", es: "Fósforo sérico", zh: "血磷 (P)",
  },
  crp: {
    hi: "सी-रिएक्टिव प्रोटीन (CRP)", ta: "CRP (வீக்கம்)", te: "CRP (వాపు)", kn: "CRP", ml: "CRP", pa: "CRP", mr: "CRP", fr: "Protéine C-réactive (CRP)", de: "C-reaktives Protein (CRP)", es: "Proteína C reactiva (CRP)", zh: "C反应蛋白 (CRP)",
  },
};

/**
 * Dynamic glossary of clinical terms used to translate unseen/custom newly uploaded lab markers!
 */
const DYNAMIC_TERM_GLOSSARY: Record<string, Partial<Record<AppLanguage, string>>> = {
  urine: { hi: "पेशाब", ta: "சிறுநீர்", te: "మూత్ర", kn: "ಮೂತ್ರ", ml: "മൂത്ര", pa: "ਪਿਸ਼ਾਬ", mr: "लघवी", fr: "Urine", de: "Urin", es: "Orina", zh: "尿液" },
  serum: { hi: "सीरम", ta: "சீரம்", te: "సీరం", kn: "ಸೀರಮ್", ml: "സീറം", pa: "ਸੀਰਮ", mr: "सीरम", fr: "Sérique", de: "Serum", es: "Sérico", zh: "血清" },
  blood: { hi: "रक्त", ta: "இரத்த", te: "రక్త", kn: "ರಕ್ತ", ml: "രക്ത", pa: "ਖੂਨ", mr: "रक्त", fr: "Sanguin", de: "Blut", es: "Sangre", zh: "血液" },
  total: { hi: "कुल", ta: "மொத்த", te: "మొత్తం", kn: "ಒಟ್ಟು", ml: "ആകെ", pa: "ਕੁੱਲ", mr: "एकूण", fr: "Total", de: "Gesamt", es: "Total", zh: "总" },
  free: { hi: "फ्री", ta: "ஃப்ரீ", te: "ఫ్రీ", kn: "ಫ್ರೀ", ml: "ഫ്രീ", pa: "ਫ੍ਰੀ", mr: "फ्री", fr: "Libre", de: "Freies", es: "Libre", zh: "游离" },
  direct: { hi: "डायरेक्ट", ta: "நேரடி", te: "డైరెక్ట్", kn: "ಡೈರೆಕ್ಟ್", ml: "ഡയറക്ട്", pa: "ਡਾਇਰੈਕਟ", mr: "डायरेक्ट", fr: "Directe", de: "Direkt", es: "Directa", zh: "直接" },
  indirect: { hi: "इनडायरेक्ट", ta: "மறைமுக", te: "ఇన్‌డైరెక్ట్", kn: "ಇನ್‌ಡೈರೆಕ್ಟ್", ml: "ഇൻഡയറക്ട്", pa: "ਇਨਡਾਇਰੈਕਟ", mr: "इनडायरेक्ट", fr: "Indirecte", de: "Indirekt", es: "Indirecta", zh: "间接" },
  fasting: { hi: "खाली पेट", ta: "உணவுக்கு முன்", te: "ఉపవాస", kn: "ಉಪವಾಸದ", ml: "ഉപവാസ", pa: "ਖਾਲੀ ਪੇਟ", mr: "रिकाम्या पोटी", fr: "À jeun", de: "Nüchtern", es: "En ayunas", zh: "空腹" },
  count: { hi: "गिनती", ta: "எண்ணிக்கை", te: "సంఖ్య", kn: "ಎಣಿಕೆ", ml: "എണ്ണം", pa: "ਗਿਣਤੀ", mr: "संख्या", fr: "Numération", de: "Anzahl", es: "Recuento", zh: "计数" },
  absolute: { hi: "पूर्ण", ta: "முழு", te: "సంపూర్ణ", kn: "ಸಂಪೂರ್ಣ", ml: "സമ്പൂർണ്ണ", pa: "ਮੁਕੰਮਲ", mr: "पूर्ण", fr: "Absolu", de: "Absolut", es: "Absoluto", zh: "绝对值" },
  ratio: { hi: "अनुपात", ta: "விகிதம்", te: "నిష్పత్తి", kn: "ಅನುಪಾತ", ml: "ಅനുപാതം", pa: "ਅਨੁਪਾਤ", mr: "गुणोत्तर", fr: "Rapport", de: "Quotient", es: "Relación", zh: "比值" },
  glucose: { hi: "शुगर / ग्लूकोज", ta: "சர்க்கரை", te: "చక్కెర", kn: "ಸಕ್ಕರೆ", ml: "പഞ്ചസാര", pa: "ਸ਼ੂਗਰ", mr: "साखर", fr: "Glucose", de: "Glukose", es: "Glucosa", zh: "葡萄糖" },
  sugar: { hi: "शुगर", ta: "சர்க்கரை", te: "చక్కెర", kn: "ಸಕ್ಕರೆ", ml: "പഞ്ചസാര", pa: "ਸ਼ੂਗਰ", mr: "साखर", fr: "Sucre", de: "Zucker", es: "Azúcar", zh: "糖" },
  protein: { hi: "प्रोटीन", ta: "புரதம்", te: "ప్రోటీన్", kn: "ಪ್ರೋಟೀನ್", ml: "പ്രോട്ടീൻ", pa: "ਪ੍ਰੋਟੀਨ", mr: "प्रथिने", fr: "Protéines", de: "Eiweiß", es: "Proteína", zh: "蛋白" },
  cholesterol: { hi: "कोलेस्ट्रॉल", ta: "கொலஸ்ட்ரால்", te: "కొలెస్ట్రాల్", kn: "ಕೊಲೆಸ್ಟ್ರಾಲ್", ml: "കൊളസ്ട്രോൾ", pa: "ਕੋਲੈਸਟ੍ਰੋਲ", mr: "कोलेस्ट्रॉल", fr: "Cholestérol", de: "Cholesterin", es: "Colesterol", zh: "胆固醇" },
  vitamin: { hi: "विटामिन", ta: "வைட்டமின்", te: "విటమిన్", kn: "ವಿಟಮಿನ್", ml: "വിറ്റാമിൻ", pa: "ਵਿਟਾਮਿਨ", mr: "व्हिटॅमिन", fr: "Vitamine", de: "Vitamin", es: "Vitamina", zh: "维生素" },
  iron: { hi: "आयरन", ta: "இரும்புச்சத்து", te: "ఐరన్", kn: "ಕಬ್ಬಿಣ", ml: "ഇരുമ്പ്", pa: "ਆਇਰਨ", mr: "लोह", fr: "Fer", de: "Eisen", es: "Hierro", zh: "铁" },
  bilirubin: { hi: "बिलीरुबिन", ta: "பிலிரூபின்", te: "బిలిరుబిన్", kn: "ಬಿಲಿರುಬಿನ್", ml: "ബിലിറൂബിൻ", pa: "ਬਿਲੀਰੂਬਿਨ", mr: "बिलीरुबिन", fr: "Bilirubine", de: "Bilirubin", es: "Bilirrubina", zh: "胆红素" },
  specific: { hi: "विशिष्ट", ta: "குறிப்பிட்ட", te: "నిర్దిష్ట", kn: "ನಿರ್ದಿಷ್ಟ", ml: "നിർദ്ദിഷ്ട", pa: "ਖਾਸ", mr: "विशिष्ट", fr: "Spécifique", de: "Spezifisch", es: "Específica", zh: "比" },
  gravity: { hi: "घनत्व", ta: "அடர்த்தி", te: "సాంద్రత", kn: "ಸಾಂದ್ರತೆ", ml: "സാന്ദ്രത", pa: "ਘਣਤਾ", mr: "घनता", fr: "Gravité", de: "Gewicht", es: "Gravedad", zh: "重" },
  ketone: { hi: "कीटोन", ta: "கீட்டோன்", te: "కీటోన్", kn: "ಕೀಟೋನ್", ml: "കീറ്റോൺ", pa: "ਕੀਟੋਨ", mr: "कीटोन", fr: "Cétones", de: "Keton", es: "Cetonas", zh: "酮体" },
  antibody: { hi: "एंटीबॉडी", ta: "ஆன்டிபாடி", te: "యాంటీబాడీ", kn: "ಪ್ರತಿಕಾಯ", ml: "ആന്റിബോഡി", pa: "ਐਂਟੀਬਾਡੀ", mr: "अँटीबॉडी", fr: "Anticorps", de: "Antikörper", es: "Anticuerpo", zh: "抗体" },
};

/**
 * Dynamically translates unseen / newly uploaded test names word-by-word while keeping acronyms intact.
 */
export function translateDynamicTestName(rawName: string, lang: AppLanguage): string {
  if (!rawName || lang === "en") return rawName;

  const tokens = rawName.split(/(\s+|[()/,_-]+)/);
  let changed = false;

  const translatedTokens = tokens.map((tok) => {
    const lower = tok.toLowerCase();
    const match = DYNAMIC_TERM_GLOSSARY[lower]?.[lang];
    if (match) {
      changed = true;
      return match;
    }
    return tok;
  });

  if (!changed) return rawName;
  const result = translatedTokens.join("").replace(/\s+/g, " ").trim();
  return `${result} (${rawName})`;
}

/**
 * Curated layman explanations for key biomarkers across all 12 languages.
 */
const METRIC_EXPLANATION_MAP: Record<string, Partial<Record<AppLanguage, string>>> = {
  hemoglobin: {
    hi: "यह आपके फेफड़ों से पूरे शरीर तक ऑक्सीजन पहुंचाता है। कम होने पर थकान या कमजोरी महसूस हो सकती है।",
    ta: "உங்கள் நுரையீரலில் இருந்து உடல் முழுவதும் ஆக்ஸிஜனை எடுத்துச் செல்கிறது. குறைந்தால் சோர்வு ஏற்படலாம்.",
    te: "ఊపిరితిత్తుల నుండి శరీరమంతా ఆక్సిజన్‌ను తీసుకెళ్తుంది. తక్కువగా ఉంటే అలసట కలగవచ్చు.",
    kn: "ಶ್ವಾಸಕೋಶದಿಂದ ದೇಹದ ಎಲ್ಲಾ ಭಾಗಗಳಿಗೆ ಆಮ್ಲಜನಕ ಸಾಗಿಸುತ್ತದೆ. ಕಡಿಮೆಯಾದರೆ ಸುಸ್ತು ಅನಿಸಬಹುದು.",
    ml: "ശ്വാസകോശത്തിൽ നിന്ന് ശരീരത്തിലുടനീളം ഓക്സിജൻ എത്തിക്കുന്നു. കുറഞ്ഞാൽ ക്ഷീണം അനുഭവപ്പെടാം.",
    pa: "ਫੇਫੜਿਆਂ ਤੋਂ ਪੂਰੇ ਸਰੀਰ ਤੱਕ ਆਕਸੀਜਨ ਪਹੁੰਚਾਉਂਦਾ ਹੈ। ਘੱਟ ਹੋਣ ਤੇ ਥਕਾਵਟ ਹੋ ਸਕਦੀ ਹੈ।",
    mr: "फुफ्फुसातून संपूर्ण शरीरात ऑक्सिजन पोहोचवते. कमी असल्यास थकवा जाणवू शकतो.",
    fr: "Transporte l'oxygène des poumons vers tout le corps. Un taux bas peut provoquer de la fatigue.",
    de: "Transportiert Sauerstoff von der Lunge durch den ganzen Körper. Ein niedriger Wert kann müde machen.",
    es: "Transporta oxígeno desde los pulmones al resto del cuerpo. Niveles bajos pueden causar cansancio.",
    zh: "负责把肺部吸入的氧气输送到全身。偏低时容易感到疲劳、乏力。",
  },
  glucose_fasting: {
    hi: "खाली पेट आपके खून में शुगर का स्तर दिखाता है — यह डायबिटीज़ की मुख्य शुरुआती जांच है।",
    ta: "உணவு உண்ணாமல் இருக்கும்போது இரத்தத்தில் உள்ள சர்க்கரை அளவைக் காட்டுகிறது.",
    te: "ఉపవాస సమయంలో రక్తంలోని చక్కెర స్థాయిని చూపిస్తుంది — ఇది షుగర్ ప్రధాన పరీక్ష.",
    kn: "ಉಪವಾಸದ ಸಮಯದಲ್ಲಿ ರಕ್ತದಲ್ಲಿರುವ ಸಕ್ಕರೆ ಪ್ರಮಾಣವನ್ನು ತೋರಿಸುತ್ತದೆ.",
    ml: "ഭക്ഷണം കഴിക്കാതെ ഇരിക്കുമ്പോഴുള്ള രക്തത്തിലെ പഞ്ചസാരയുടെ അളവ് കാണിക്കുന്നു.",
    pa: "ਖਾਲੀ ਪੇਟ ਖੂਨ ਵਿੱਚ ਸ਼ੂਗਰ ਦਾ ਪੱਧਰ ਦੱਸਦਾ ਹੈ — ਸ਼ੂਗਰ ਦੀ ਮੁੱਖ ਜਾਂਚ।",
    mr: "रिकाम्या पोटी रक्तातील साखरेची पातळी दाखवते — मधुमेहाची मुख्य प्राथमिक तपासणी.",
    fr: "Mesure votre taux de sucre dans le sang à jeun, principal indicateur du diabète.",
    de: "Zeigt Ihren Blutzucker nach einer Nachtruhe ohne Essen — der wichtigste Diabetes-Basischeck.",
    es: "Mide el nivel de azúcar en sangre tras ayunar, la prueba principal para detectar diabetes.",
    zh: "反映空腹状态下的血糖水平，是筛查糖尿病的基础指标。",
  },
  hba1c: {
    hi: "पिछले 3 महीनों की औसत ब्लड शुगर बताता है — जैसे आपकी शुगर का तीन महीने का रिपोर्ट कार्ड।",
    ta: "கடந்த 3 மாதங்களின் சராசரி இரத்த சர்க்கரை அளவைக் காட்டுகிறது.",
    te: "గత 3 నెలల సగటు రక్త చక్కెర స్థాయిని చూపిస్తుంది.",
    kn: "ಕಳೆದ 3 ತಿಂಗಳ ಸರಾಸರಿ ರಕ್ತದ ಸಕ್ಕರೆ ಮಟ್ಟವನ್ನು ತೋರಿಸುತ್ತದೆ.",
    ml: "കഴിഞ്ഞ 3 മാസത്തെ ശരാശരി രക്തത്തിലെ പഞ്ചസാര നില കാണിക്കുന്നു.",
    pa: "ਪਿਛਲੇ 3 ਮਹੀਨਿਆਂ ਦੀ ਔਸਤ ਬਲੱਡ ਸ਼ੂਗਰ ਦੱਸਦਾ ਹੈ।",
    mr: "मागील 3 महिन्यांतील सरासरी रक्तातील साखर दाखवते.",
    fr: "Indique votre moyenne de sucre dans le sang sur les 3 derniers mois.",
    de: "Zeigt Ihren durchschnittlichen Blutzucker der letzten 3 Monate wie ein Langzeit-Zeugnis.",
    es: "Muestra tu nivel promedio de azúcar en los últimos 3 meses.",
    zh: "反映过去约3个月的平均血糖水平，是血糖控制的长期指标。",
  },
  cholesterol_total: {
    hi: "खून में मौजूद कुल कोलेस्ट्रॉल की मात्रा बताता है। संतुलित स्तर दिल और नसों को स्वस्थ रखता है।",
    ta: "இரத்தத்தில் உள்ள மொத்த கொழுப்பின் அளவைக் காட்டுகிறது; இதய ஆரோக்கியத்திற்கு முக்கியம்.",
    te: "రక్తంలోని మొత్తం కొలెస్ట్రాల్ స్థాయిని చూపిస్తుంది; గుండె ఆరోగ్యానికి ముఖ్యం.",
    kn: "ರಕ್ತದಲ್ಲಿನ ಒಟ್ಟು ಕೊಲೆಸ್ಟ್ರಾಲ್ ಪ್ರಮಾಣವನ್ನು ತೋರಿಸುತ್ತದೆ; ಹೃದಯದ ಆರೋಗ್ಯಕ್ಕೆ ಮುಖ್ಯ.",
    ml: "രക്തത്തിലെ ആകെ കൊളസ്ട്രോൾ അളവ് കാണിക്കുന്നു; ഹൃദയാരോഗ്യത്തിന് പ്രധാനമാണ്.",
    pa: "ਖੂਨ ਵਿੱਚ ਕੁੱਲ ਕੋਲੈਸਟ੍ਰੋਲ ਦੀ ਮਾਤਰਾ ਦੱਸਦਾ ਹੈ ਜੋ ਦਿਲ ਦੀ ਸਿਹਤ ਲਈ ਜ਼ਰੂਰੀ ਹੈ।",
    mr: "रक्तातील एकूण कोलेस्ट्रॉलचे प्रमाण दाखवते; हृदयाच्या आरोग्यासाठी महत्त्वाचे.",
    fr: "Mesure la quantité totale de cholestérol dans votre sang pour protéger votre cœur.",
    de: "Zeigt das gesamte Cholesterin im Blut. Ausgeglichene Werte schützen Herz und Gefäße.",
    es: "Mide el colesterol total en sangre; mantenerlo equilibrado cuida tu corazón.",
    zh: "测量血液中的总胆固醇含量，保持平衡有助于保护心脏和血管。",
  },
  ldl: {
    hi: "इसे 'खराब' कोलेस्ट्रॉल कहा जाता है क्योंकि ज़्यादा होने पर यह धीरे-धीरे नसों में जम सकता है।",
    fr: "Souvent appelé « mauvais » cholestérol, car en excès il peut encrasser les artères.",
    de: "Oft als „schlechtes“ Cholesterin bezeichnet, da es sich in den Gefäßen ablagern kann.",
    es: "Llamado colesterol «malo», ya que en exceso puede acumularse en las arterias.",
    zh: "常被称为“坏”胆固醇，过高时容易在血管壁慢慢沉积。",
  },
  hdl: {
    hi: "इसे 'अच्छा' कोलेस्ट्रॉल कहते हैं क्योंकि यह खून से अतिरिक्त चिकनाई साफ करने में मदद करता है।",
    fr: "Appelé « bon » cholestérol car il aide à nettoyer l'excès de graisses dans le sang.",
    de: "Das „gute“ Cholesterin, weil es überschüssige Fette aus den Blutgefäßen abtransportiert.",
    es: "El colesterol «bueno», porque ayuda a limpiar el exceso de grasa de la sangre.",
    zh: "常被称为“好”胆固醇，有助于清理血管中多余的脂质。",
  },
  creatinine: {
    hi: "मांसपेशियों से बनने वाला अपशिष्ट है जिसे आपकी किडनी छानकर बाहर निकालती है।",
    ta: "உங்கள் சிறுநீரகம் கழிவுகளை எவ்வளவு நன்றாக வடிகட்டுகிறது என்பதைக் காட்டுகிறது.",
    te: "మీ కిడ్నీలు వ్యర్థాలను ఎంత బాగా వడపోస్తున్నాయో చూపిస్తుంది.",
    kn: "ನಿಮ್ಮ ಕಿಡ್ನಿಗಳು ತ್ಯಾಜ್ಯವನ್ನು ಎಷ್ಟು ಚೆನ್ನಾಗಿ ಶೋಧಿಸುತ್ತವೆ ಎಂಬುದನ್ನು ತೋರಿಸುತ್ತದೆ.",
    ml: "വൃക്കകൾ രക്തത്തിലെ മാലിന്യം എത്ര നന്നായി അരിച്ചുകളയുന്നു എന്ന് കാണിക്കുന്നു.",
    pa: "ਦੱਸਦਾ ਹੈ ਕਿ ਤੁਹਾਡੀਆਂ ਕਿਡਨੀਆਂ ਖੂਨ ਵਿੱਚੋਂ ਗੰਦਗੀ ਕਿੰਨੀ ਚੰਗੀ ਤਰ੍ਹਾਂ ਸਾਫ਼ ਕਰ ਰਹੀਆਂ ਹਨ।",
    mr: "तुमचे मूत्रपिंड रक्तातील कचरा किती चांगल्या प्रकारे गाळतात ते दर्शवते.",
    fr: "Déchet naturel filtré par vos reins. Un taux stable montre que vos reins fonctionnent bien.",
    de: "Ein Abfallprodukt, das die Nieren aus dem Blut filtern. Stabile Werte zeigen gesunde Nieren.",
    es: "Desecho filtrado por tus riñones; valores estables indican buena función renal.",
    zh: "肌肉代谢产生的废物，通过肾脏过滤排出；数值稳定说明肾脏过滤良好。",
  },
  tsh: {
    hi: "यह दिमाग से आने वाला संकेत है जो थायरॉइड ग्रंथि को शरीर की ऊर्जा और गति नियंत्रित करने का आदेश देता है।",
    fr: "Signal indiquant à votre thyroïde à quelle vitesse réguler votre énergie.",
    de: "Steuert als Botenstoff Ihre Schilddrüse und damit Energie und Stoffwechseltempo.",
    es: "Señal que indica a tu tiroides qué tan rápido o lento regular tu energía.",
    zh: "调控甲状腺工作节奏的信号激素，影响身体的能量代谢和体温。",
  },
  alt: {
    hi: "यह लिवर की सेहत जांचता है। बढ़ा हुआ स्तर लिवर कोशिकाओं पर दबाव या सूजन का संकेत देता है।",
    fr: "Vérifie la santé du foie. Un taux élevé indique un stress des cellules hépatiques.",
    de: "Prüft die Lebergesundheit. Erhöhte Werte deuten auf gereizte Leberzellen hin.",
    es: "Evalúa la salud del hígado; valores altos suelen indicar estrés hepático.",
    zh: "反映肝脏健康的重要酶，偏高通常提示肝细胞受累或轻微炎症。",
  },
  vitamin_d: {
    hi: "यह 'धूप वाला विटामिन' है जो हड्डियों को मज़बूत बनाता है और रोग प्रतिरोधक क्षमता बढ़ाता है।",
    fr: "La « vitamine du soleil », essentielle pour des os solides et l'immunité.",
    de: "Das „Sonnenvitamin“ für starke Knochen, gute Stimmung und ein starkes Immunsystem.",
    es: "La «vitamina del sol», clave para huesos fuertes, ánimo y defensas.",
    zh: "即“阳光维生素”，帮助骨骼强健、维持情绪稳定并支持免疫力。",
  },
  vitamin_b12: {
    hi: "ऊर्जा, नसों की सेहत, याददाश्त और नए लाल रक्त कण बनाने के लिए बहुत ज़रूरी है।",
    fr: "Indispensable pour l'énergie, les nerfs, la mémoire et les globules rouges.",
    de: "Wichtig für Energie, gesunde Nerven, Konzentration und neue rote Blutkörperchen.",
    es: "Esencial para tener energía, cuidar los nervios y formar glóbulos rojos.",
    zh: "对日常精力、神经健康、记忆力以及生成红细胞至关重要。",
  },
};

const CATEGORY_FALLBACKS_I18N: Record<MetricCategory, Record<AppLanguage, string>> = {
  Blood: {
    en: "Checks your blood cells to help spot tiredness, oxygen transport, clotting, or infection signs.",
    hi: "खून के कणों की जांच करता है ताकि थकान, ऑक्सीजन की कमी, खून जमने या संक्रमण का पता चल सके।",
    ta: "சோர்வு, ஆக்ஸிஜன் போக்குவரத்து மற்றும் தொற்று அறிகுறிகளைக் கண்டறிய இரத்த அணுக்களைச் சரிபார்க்கிறது.",
    te: "అలసట, ఆక్సిజన్ సరఫరా మరియు ఇన్ఫెక్షన్ సంకేతాలను గుర్తించడానికి రక్త కణాలను పరీక్షిస్తుంది.",
    kn: "ಸುಸ್ತು, ಆಮ್ಲಜನಕ ಸಾಗಣೆ ಮತ್ತು ಸೋಂಕಿನ ಚಿಹ್ನೆಗಳನ್ನು ಗುರುತಿಸಲು ರಕ್ತ ಕಣಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "ക്ഷീണം, ഓക്സിജൻ വിതരണം, അണുബാധ എന്നിവ കണ്ടെത്താൻ രക്തകോശങ്ങളെ പരിശോധിക്കുന്നു.",
    pa: "ਥਕਾਵਟ, ਆਕਸੀਜਨ ਅਤੇ ਇਨਫੈਕਸ਼ਨ ਦੇ ਲੱਛਣ ਦੇਖਣ ਲਈ ਖੂਨ ਦੇ ਸੈੱਲਾਂ ਦੀ ਜਾਂਚ ਕਰਦਾ ਹੈ।",
    mr: "थकवा, ऑक्सिजन पुरवठा किंवा संसर्गाची चिन्हे तपासण्यासाठी रक्तपेशी मोजते.",
    fr: "Analyse vos cellules sanguines pour repérer fatigue, oxygénation, coagulation ou infection.",
    de: "Untersucht Ihre Blutzellen auf Müdigkeit, Sauerstofftransport, Gerinnung oder Infekte.",
    es: "Analiza tus células sanguíneas para detectar fatiga, oxigenación, coagulación o infecciones.",
    zh: "检测血液细胞状态，帮助评估氧气输送、凝血功能或感染迹象。",
  },
  Lipids: {
    en: "Checks blood fats and cholesterol balance to help protect your heart and blood vessels.",
    hi: "खून में चर्बी और कोलेस्ट्रॉल का संतुलन जांचता है ताकि दिल और नसें सुरक्षित रहें।",
    ta: "இதயம் மற்றும் இரத்த நாளங்களைப் பாதுகாக்க இரத்த கொழுப்பு மற்றும் கொலஸ்ட்ராலைச் சரிபார்க்கிறது.",
    te: "గుండె మరియు రక్తనాళాలను రక్షించడానికి రక్త కొవ్వులు మరియు కొలెస్ట్రాల్‌ను తనిఖీ చేస్తుంది.",
    kn: "ಹೃದಯ ಮತ್ತು ರಕ್ತನಾಳಗಳನ್ನು ರಕ್ಷಿಸಲು ರಕ್ತದ ಕೊಬ್ಬು ಮತ್ತು ಕೊಲೆಸ್ಟ್ರಾಲ್ ಸಮತೋಲನವನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "ഹൃദയത്തെയും രക്തക്കുഴലുകളെയും സംരക്ഷിക്കാൻ രക്തത്തിലെ കൊഴുപ്പും കൊളസ്ട്രോളും പരിശോധിക്കുന്നു.",
    pa: "ਦਿਲ ਅਤੇ ਨਾੜੀਆਂ ਨੂੰ ਬਚਾਉਣ ਲਈ ਖੂਨ ਵਿੱਚ ਚਰਬੀ ਅਤੇ ਕੋਲੈਸਟ੍ਰੋਲ ਦਾ ਸੰਤੁਲਨ ਜਾਂਚਦਾ ਹੈ।",
    mr: "हृदय आणि रक्तवाहिन्या सुरक्षित ठेवण्यासाठी रक्तातील चरबी व कोलेस्ट्रॉल तपासते.",
    fr: "Contrôle les graisses et le cholestérol sanguins pour protéger votre cœur et vos artères.",
    de: "Prüft Blutfette und Cholesterin zum Schutz von Herz und Blutgefäßen.",
    es: "Controla las grasas y el colesterol en sangre para proteger tu corazón y arterias.",
    zh: "检查血脂与胆固醇平衡，帮助保护心脏和血管健康。",
  },
  Sugar: {
    en: "Shows how your body handles and processes sugar for steady daily energy.",
    hi: "दिखाता है कि आपका शरीर रोज़मर्रा की ऊर्जा के लिए शुगर को कैसे संभालता है।",
    ta: "தினசரி ஆற்றலுக்காக உங்கள் உடல் சர்க்கரையை எவ்வாறு கையாள்கிறது என்பதைக் காட்டுகிறது.",
    te: "రోజువారీ శక్తి కోసం మీ శరీరం చక్కెరను ఎలా ప్రాసెస్ చేస్తుందో చూపిస్తుంది.",
    kn: "ದೈನಂದಿನ ಶಕ್ತಿಗಾಗಿ ನಿಮ್ಮ ದೇಹವು ಸಕ್ಕರೆಯನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ತೋರಿಸುತ್ತದೆ.",
    ml: "ദൈനംദിന ഊർജ്ജത്തിനായി നിങ്ങളുടെ ശരീരം പഞ്ചസാരയെ എങ്ങനെ കൈകാര്യം ചെയ്യുന്നു എന്ന് കാണിക്കുന്നു.",
    pa: "ਦੱਸਦਾ ਹੈ ਕਿ ਤੁਹਾਡਾ ਸਰੀਰ ਰੋਜ਼ਾਨਾ ਊਰਜਾ ਲਈ ਸ਼ੂਗਰ ਨੂੰ ਕਿਵੇਂ ਸੰਭਾਲਦਾ ਹੈ।",
    mr: "रोजच्या ऊर्जेसाठी तुमचे शरीर साखर कशी हाताळते हे दर्शवते.",
    fr: "Montre comment votre corps gère et utilise le sucre pour votre énergie quotidienne.",
    de: "Zeigt, wie Ihr Körper Zucker für gleichmäßige Energie im Alltag verarbeitet.",
    es: "Muestra cómo tu cuerpo procesa el azúcar para mantener tu energía diaria.",
    zh: "反映身体如何处理和利用血糖，维持日常稳定能量。",
  },
  Thyroid: {
    en: "Checks your thyroid gland, which sets the pace for your energy, weight, and body temperature.",
    hi: "आपकी थायरॉइड ग्रंथि की जांच करता है जो शरीर की ऊर्जा, वज़न और तापमान को नियंत्रित करती है।",
    ta: "உங்கள் ஆற்றல், எடை மற்றும் உடல் வெப்பநிலையைக் கட்டுப்படுத்தும் தைராய்டு சுரப்பியைச் சரிபார்க்கிறது.",
    te: "మీ శక్తి, బరువు మరియు శరీర ఉష్ణోగ్రతను నియంత్రించే థైరాయిడ్ గ్రంథిని తనిఖీ చేస్తుంది.",
    kn: "ನಿಮ್ಮ ಶಕ್ತಿ, ತೂಕ ಮತ್ತು ದೇಹದ ತಾಪಮಾನವನ್ನು ನಿಯಂತ್ರಿಸುವ ಥೈರಾಯ್ಡ್ ಗ್ರಂಥಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "ഊർജ്ജം, ഭാരം, ശരീര താപനില എന്നിവ നിയന്ത്രിക്കുന്ന തൈറോയ്ഡ് ഗ്രന്ഥിയെ പരിശോധിക്കുന്നു.",
    pa: "ਥਾਇਰਾਇਡ ਗ੍ਰੰਥੀ ਦੀ ਜਾਂਚ ਕਰਦਾ ਹੈ ਜੋ ਤੁਹਾਡੀ ਊਰਜਾ, ਭਾਰ ਅਤੇ ਤਾਪਮਾਨ ਨੂੰ ਕਾਬੂ ਕਰਦੀ ਹੈ।",
    mr: "तुमची ऊर्जा, वजन आणि तापमान नियंत्रित करणाऱ्या थायरॉईड ग्रंथीची तपासणी करते.",
    fr: "Vérifie la thyroïde, qui régule votre rythme d'énergie, poids et température.",
    de: "Prüft Ihre Schilddrüse, die Energie, Gewicht und Körpertemperatur steuert.",
    es: "Evalúa tu tiroides, encargada de regular tu energía, peso y temperatura.",
    zh: "检查甲状腺功能，它调节着身体的能量消耗、体重和体温节奏。",
  },
  Liver: {
    en: "Checks how smoothly your liver is cleaning toxins, making proteins, and processing nutrients.",
    hi: "जांचता है कि आपका लिवर विषैले तत्व साफ करने, प्रोटीन बनाने और पोषण पचाने में कितना स्वस्थ है।",
    ta: "கல்லீரல் நச்சுக்களை நீக்குவதையும் புரதங்களை உருவாக்குவதையும் எவ்வளவு சிறப்பாகச் செய்கிறது என்பதைச் சரிபார்க்கிறது.",
    te: "మీ లివర్ విషపదార్థాలను శుభ్రం చేయడం మరియు ప్రోటీన్లు తయారు చేయడం ఎంత బాగా చేస్తుందో చూస్తుంది.",
    kn: "ನಿಮ್ಮ ಲಿವರ್ ಕಲ್ಮಶಗಳನ್ನು ಶುಚಿಗೊಳಿಸುವ ಮತ್ತು ಪ್ರೋಟೀನ್ ತಯಾರಿಸುವ ಕೆಲಸವನ್ನು ಹೇಗೆ ಮಾಡುತ್ತಿದೆ ಎಂದು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "കരൾ വിഷാംശം നീക്കം ചെയ്യുന്നതും പ്രോട്ടീൻ നിർമ്മിക്കുന്നതും എത്ര സുഗമമാണെന്ന് പരിശോധിക്കുന്നു.",
    pa: "ਜਾਂਚਦਾ ਹੈ ਕਿ ਤੁਹਾਡਾ ਲਿਵਰ ਗੰਦਗੀ ਸਾਫ਼ ਕਰਨ ਅਤੇ ਪ੍ਰੋਟੀਨ ਬਣਾਉਣ ਵਿੱਚ ਕਿੰਨਾ ਤੰਦਰੁਸਤ ਹੈ।",
    mr: "तुमचे यकृत विषारी घटक साफ करणे आणि प्रथिने तयार करणे किती सुरळीत करत आहे हे तपासते.",
    fr: "Vérifie si votre foie élimine bien les toxines et fabrique les protéines nécessaires.",
    de: "Prüft, wie gut Ihre Leber entgiftet, Proteine bildet und Nährstoffe verarbeitet.",
    es: "Comprueba qué tan bien limpia toxinas y produce proteínas tu hígado.",
    zh: "检查肝脏排毒、合成蛋白质以及代谢营养物质的健康状况。",
  },
  Kidney: {
    en: "Checks how effectively your kidneys filter daily waste and balance fluids in your body.",
    hi: "जांचता है कि आपकी किडनी रोज़मर्रा के अपशिष्ट को छानने और पानी का संतुलन रखने में कैसी है।",
    ta: "உங்கள் சிறுநீரகங்கள் கழிவுகளை வடிகட்டி உடலின் நீர்ச்சத்தை எவ்வாறு சமநிலைப்படுத்துகின்றன என்பதைச் சரிபார்க்கிறது.",
    te: "మీ కిడ్నీలు వ్యర్థాలను వడపోసి శరీరంలో ద్రవాలను ఎలా సమతుల్యం చేస్తున్నాయో తనిఖీ చేస్తుంది.",
    kn: "ನಿಮ್ಮ ಕಿಡ್ನಿಗಳು ತ್ಯಾಜ್ಯವನ್ನು ಶೋಧಿಸಿ ದೇಹದ ದ್ರವಗಳನ್ನು ಹೇಗೆ ಸಮತೋಲನಗೊಳಿಸುತ್ತವೆ ಎಂದು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "വൃക്കകൾ മാലിന്യം അരിച്ചെടുക്കുകയും ശരീരത്തിലെ ജലാംശം നിയന്ത്രിക്കുകയും ചെയ്യുന്നത് പരിശോധിക്കുന്നു.",
    pa: "ਜਾਂਚਦਾ ਹੈ ਕਿ ਤੁਹਾਡੀਆਂ ਕਿਡਨੀਆਂ ਗੰਦਗੀ ਸਾਫ਼ ਕਰਨ ਅਤੇ ਪਾਣੀ ਦਾ ਸੰਤੁਲਨ ਰੱਖਣ ਵਿੱਚ ਕਿੰਨੀਆਂ ਕਾਰਗਰ ਹਨ।",
    mr: "तुमचे मूत्रपिंड दररोजचा कचरा कसा गाळतात आणि पाण्याचे संतुलन कसे राखतात हे तपासते.",
    fr: "Évalue comment vos reins filtrent les déchets et équilibrent les liquides.",
    de: "Prüft, wie effektiv Ihre Nieren Abfallstoffe filtern und den Wasserhaushalt steuern.",
    es: "Evalúa qué tan bien filtran desechos y equilibran líquidos tus riñones.",
    zh: "检查肾脏过滤体内废物和维持水分平衡的能力。",
  },
  Vitamins: {
    en: "Checks essential vitamin or mineral reserves your body needs for energy, nerves, and bones.",
    hi: "ऊर्जा, नसों और हड्डियों के लिए ज़रूरी विटामिन व खनिजों का भंडार जांचता है।",
    ta: "ஆற்றல், நரம்புகள் மற்றும் எலும்புகளுக்குத் தேவையான வைட்டமின் மற்றும் தாதுக்களைச் சரிபார்க்கிறது.",
    te: "శక్తి, నరాలు మరియు ఎముకలకు అవసరమైన విటమిన్లు లేదా ఖనిజాలను తనిఖీ చేస్తుంది.",
    kn: "ಶಕ್ತಿ, ನರಗಳು ಮತ್ತು ಮೂಳೆಗಳಿಗೆ ಅಗತ್ಯವಿರುವ ವಿಟಮಿನ್ ಅಥವಾ ಖನಿಜಗಳ ಮಟ್ಟವನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "ഊർജ്ജത്തിനും നാഡികൾക്കും എല്ലുകൾക്കും ആവശ്യമായ വിറ്റാമിൻ, ധാതു ശേഖരം പരിശോധിക്കുന്നു.",
    pa: "ਊਰਜਾ, ਨਸਾਂ ਅਤੇ ਹੱਡੀਆਂ ਲਈ ਜ਼ਰੂਰੀ ਵਿਟਾਮਿਨ ਅਤੇ ਖਣਿਜਾਂ ਦੀ ਮਾਤਰਾ ਜਾਂਚਦਾ ਹੈ।",
    mr: "ऊर्जा, मज्जातंतू आणि हाडांसाठी आवश्यक जीवनसत्त्वे आणि खनिजांचा साठा तपासते.",
    fr: "Vérifie vos réserves de vitamines et minéraux clés pour l'énergie, les nerfs et les os.",
    de: "Prüft wichtige Vitamin- und Mineralstoffreserven für Energie, Nerven und Knochen.",
    es: "Mide reservas de vitaminas y minerales clave para tu energía, nervios y huesos.",
    zh: "检查维持精力、神经和骨骼健康所必需的维生素与矿物质储备。",
  },
  Hormones: {
    en: "Measures chemical messengers that guide energy, mood, metabolism, and reproductive health.",
    hi: "शरीर के उन हार्मोन्स को मापता है जो ऊर्जा, मूड और चयापचय को संतुलित रखते हैं।",
    ta: "ஆற்றல், மனநிலை மற்றும் வளர்சிதை மாற்றத்தை வழிநடத்தும் ஹார்மோன்களை அளவிடுகிறது.",
    te: "శక్తి, మానసిక స్థితి మరియు జీవక్రియను నడిపించే హార్మోన్లను కొలుస్తుంది.",
    kn: "ಶಕ್ತಿ, ಮನಸ್ಥಿತಿ ಮತ್ತು ಚಯಾಪಚಯವನ್ನು ನಿಯಂತ್ರಿಸುವ ಹಾರ್ಮೋನ್‌ಗಳನ್ನು ಅಳೆಯುತ್ತದೆ.",
    ml: "ഊർജ്ജം, മാനസികാവസ്ഥ, ഉപാപചയം എന്നിവ നിയന്ത്രിക്കുന്ന ഹോർമോണുകൾ അളക്കുന്നു.",
    pa: "ਊਰਜਾ, ਮੂਡ ਅਤੇ ਮੈਟਾਬੋਲਿਜ਼ਮ ਨੂੰ ਕਾਬੂ ਕਰਨ ਵਾਲੇ ਹਾਰਮੋਨਾਂ ਨੂੰ ਮਾਪਦਾ ਹੈ।",
    mr: "ऊर्जा, मूड आणि चयापचय नियंत्रित करणाऱ्या हार्मोन्सचे मोजमाप करते.",
    fr: "Mesure les messagers chimiques qui régulent l'énergie, l'humeur et le métabolisme.",
    de: "Misst Botenstoffe, die Energie, Stimmung, Stoffwechsel und Fruchtbarkeit steuern.",
    es: "Mide los mensajeros químicos que regulan tu energía, ánimo y metabolismo.",
    zh: "检测调节精力、情绪、新陈代谢和生殖健康的激素水平。",
  },
  Other: {
    en: "Checks an important body mineral, fluid balance, or general wellness marker in your lab report.",
    hi: "आपकी रिपोर्ट में शरीर के ज़रूरी खनिज, पानी के संतुलन या सामान्य सेहत के संकेत की जांच करता है।",
    ta: "உடல் தாதுக்கள், நீர்ச்சத்து சமநிலை அல்லது பொது ஆரோக்கியக் குறியீட்டைச் சரிபார்க்கிறது.",
    te: "శరీర ఖనిజాలు, ద్రవ సమతుల్యత లేదా సాధారణ ఆరోగ్య సూచికను తనిఖీ చేస్తుంది.",
    kn: "ದೇಹದ ಪ್ರಮುಖ ಖನಿಜ, ದ್ರವ ಸಮತೋಲನ ಅಥವಾ ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ ಸೂಚಕವನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.",
    ml: "ശരീരത്തിലെ പ്രധാന ധാതുക്കൾ, ജലസന്തുലിതാവസ്ഥ അല്ലെങ്കിൽ പൊതു ആരോഗ്യ സൂചകം പരിശോധിക്കുന്നു.",
    pa: "ਸਰੀਰ ਦੇ ਜ਼ਰੂਰੀ ਖਣਿਜ, ਪਾਣੀ ਦੇ ਸੰਤੁਲਨ ਜਾਂ ਆਮ ਸਿਹਤ ਸੰਕੇਤ ਦੀ ਜਾਂਚ ਕਰਦਾ ਹੈ।",
    mr: "शरीरातील महत्त्वाची खनिजे, द्रव संतुलन किंवा सामान्य आरोग्य निर्देशक तपासते.",
    fr: "Vérifie un minéral important, l'équilibre hydrique ou un marqueur de bien-être général.",
    de: "Prüft ein wichtiges Körpermineral, den Flüssigkeitshaushalt oder einen allgemeinen Gesundheitswert.",
    es: "Revisa un mineral clave, equilibrio de líquidos o marcador general de bienestar.",
    zh: "检查体内关键矿物质、体液平衡或基础健康指标。",
  },
};

export function getLocalizedMetricName(
  metricKey: string,
  fallbackDisplayName: string,
  lang: AppLanguage
): string {
  if (lang === "en") return fallbackDisplayName;
  const resolvedKey = resolveCanonicalMetricKey(metricKey);
  const localized = METRIC_NAME_MAP[resolvedKey]?.[lang] || METRIC_NAME_MAP[metricKey]?.[lang];
  if (localized) return localized;

  // Dynamic phrase/word translation for any unlisted or newly uploaded test name
  const baseName = METRIC_DICTIONARY[resolvedKey]?.displayName || fallbackDisplayName;
  return translateDynamicTestName(baseName, lang);
}

export function getLocalizedMetricExplanation(
  metricKey: string,
  displayName?: string,
  category?: MetricCategory,
  lang: AppLanguage = "en"
): string {
  const resolvedKey = resolveCanonicalMetricKey(metricKey);
  if (lang === "en") {
    return getLaymanExplanation(resolvedKey, displayName, category);
  }

  const curated = METRIC_EXPLANATION_MAP[resolvedKey]?.[lang] || METRIC_EXPLANATION_MAP[metricKey]?.[lang];
  if (curated) return curated;

  const label = `${metricKey || ""} ${displayName || ""}`.toLowerCase();
  let resolvedCat: MetricCategory =
    category || METRIC_DICTIONARY[resolvedKey]?.category || "Other";

  if (
    label.includes("urine") ||
    label.includes("creatin") ||
    label.includes("urea") ||
    label.includes("egfr") ||
    label.includes("bun") ||
    label.includes("uric") ||
    label.includes("pus") ||
    label.includes("ketone") ||
    label.includes("specific gravity")
  ) {
    resolvedCat = "Kidney";
  } else if (
    label.includes("bilirubin") ||
    label.includes("sgpt") ||
    label.includes("sgot") ||
    label.includes("alt") ||
    label.includes("ast") ||
    label.includes("alp") ||
    label.includes("ggt") ||
    label.includes("albumin") ||
    label.includes("globulin") ||
    label.includes("protein")
  ) {
    resolvedCat = "Liver";
  } else if (
    label.includes("glucose") ||
    label.includes("sugar") ||
    label.includes("insulin") ||
    label.includes("a1c") ||
    label.includes("homa") ||
    label.includes("peptide")
  ) {
    resolvedCat = "Sugar";
  } else if (
    label.includes("cholesterol") ||
    label.includes("lipid") ||
    label.includes("hdl") ||
    label.includes("ldl") ||
    label.includes("triglyceride") ||
    label.includes("apo") ||
    label.includes("lp(")
  ) {
    resolvedCat = "Lipids";
  } else if (
    label.includes("thyroid") ||
    label.includes("t3") ||
    label.includes("t4") ||
    label.includes("tsh") ||
    label.includes("tpo")
  ) {
    resolvedCat = "Thyroid";
  } else if (
    label.includes("vitamin") ||
    label.includes("iron") ||
    label.includes("ferritin") ||
    label.includes("folate") ||
    label.includes("tibc") ||
    label.includes("transferrin")
  ) {
    resolvedCat = "Vitamins";
  } else if (
    label.includes("testosterone") ||
    label.includes("estradiol") ||
    label.includes("progesterone") ||
    label.includes("prolactin") ||
    label.includes("cortisol") ||
    label.includes("dhea") ||
    label.includes("pth")
  ) {
    resolvedCat = "Hormones";
  } else if (
    label.includes("rbc") ||
    label.includes("wbc") ||
    label.includes("platelet") ||
    label.includes("hemoglobin") ||
    label.includes("hematocrit") ||
    label.includes("neutro") ||
    label.includes("lymph") ||
    label.includes("mono") ||
    label.includes("eosino") ||
    label.includes("baso") ||
    label.includes("mcv") ||
    label.includes("mch") ||
    label.includes("rdw") ||
    label.includes("esr") ||
    label.includes("mpv") ||
    label.includes("count")
  ) {
    resolvedCat = "Blood";
  }

  return (
    CATEGORY_FALLBACKS_I18N[resolvedCat]?.[lang] ||
    CATEGORY_FALLBACKS_I18N[resolvedCat]?.en ||
    getLaymanExplanation(metricKey, displayName, resolvedCat)
  );
}
