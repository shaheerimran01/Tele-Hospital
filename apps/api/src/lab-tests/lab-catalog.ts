// Lab & diagnostics page: the 4 sections, their 22 category cards, and the
// grouping of a package's tests into panels (CBC, LFT, KFT, ...).
//
// Each card lists the LabPackage.category values it shows. Categories are
// matched without regard to case ("Ct scan" = "CT Scan"), so the same data can be
// re-imported with different capitalisation.

export interface CategoryCard {
  /** used in the URL: /lab-tests?group=... */
  key: string;
  label: string;
  /** short line under the label */
  description: string;
  categories: string[];
}

export interface CatalogSection {
  id: string;
  title: string;
  /** the shortcut card that scrolls to another section (Section 1 → radiology) */
  shortcut?: { label: string; description: string; targetSectionId: string };
  cards: CategoryCard[];
}

export const LAB_SECTIONS: CatalogSection[] = [
  {
    id: 'needs',
    title: 'Find tests & packages for your needs',
    shortcut: { label: 'X Rays, Scans & More', description: 'CT, MRI, ultrasound, ECG and more', targetSectionId: 'radiology-section' },
    cards: [
      { key: 'full-body', label: 'Full Body Packages', description: 'Complete health checkups', categories: ['Full Body Checkup'] },
      { key: 'fever-infection', label: 'Fever & Infection Tests', description: 'Dengue, malaria, typhoid and more', categories: ['Infection', 'Fever Checkup'] },
      { key: 'diabetes', label: 'Diabetes Tests', description: 'Blood sugar, HbA1c and more', categories: ['Diabetes', 'Diabetes Test', 'Diabetic Tests'] },
      { key: 'vitamins', label: 'Vitamins Tests', description: 'Vitamin D, B12, minerals', categories: ['Vitamins & Minerals', 'Vitamin Test'] },
    ],
  },
  {
    id: 'health-needs',
    title: 'Tests and packages for your health needs',
    cards: [
      { key: 'men', label: 'Men Health', description: 'Checkups designed for men', categories: ['Men Health'] },
      { key: 'women', label: 'Women Health', description: 'Women and pregnancy care', categories: ['Women Health', 'Pregnancy / Antenatal'] },
      { key: 'liver-kidney', label: 'Liver & Kidney', description: 'LFT, KFT and related tests', categories: ['Liver', 'Kidney', 'Liver and kidney'] },
      { key: 'thyroid', label: 'Thyroid', description: 'TSH, T3, T4 and antibodies', categories: ['Thyroid tests', 'Endocrinology'] },
      { key: 'hormones', label: 'Hormones', description: 'Reproductive and other hormones', categories: ['Hormones', 'Hormone tests'] },
      { key: 'allergy', label: 'Allergy', description: 'Food and environmental allergy panels', categories: ['Allergy', 'Allergy profiles'] },
    ],
  },
  {
    id: 'radiology-section',
    title: 'Radiology tests, x-rays & scans',
    cards: [
      { key: 'ct-scan', label: 'CT Scan', description: 'Computed tomography scans', categories: ['Ct scan'] },
      { key: 'ecg', label: 'ECG', description: 'Heart rhythm tests', categories: ['Ecg test'] },
      { key: 'x-ray', label: 'X-Ray', description: 'Digital X-ray imaging', categories: ['X ray'] },
      { key: 'ultrasound', label: 'Ultrasound', description: 'Abdomen, pelvis and more', categories: ['Ultrasound'] },
      { key: 'mri', label: 'MRI', description: 'Magnetic resonance imaging', categories: ['Mri'] },
      { key: 'echo', label: 'Echo Test', description: 'Heart ultrasound', categories: ['Echo test'] },
      { key: 'radiology', label: 'General Radiology', description: 'Other imaging tests', categories: ['Radiology'] },
    ],
  },
  {
    id: 'routine',
    title: 'Routine Diagnostics & Specialized Care',
    cards: [
      { key: 'blood', label: 'Blood & Hemogram Tests', description: 'CBC, ESR and blood counts', categories: ['Blood / Hematology'] },
      { key: 'urine-stool', label: 'Digestive & Fluid Health', description: 'Urine and stool tests', categories: ['Urine / Stool'] },
      { key: 'heart', label: 'Heart & Cardiac Care', description: 'Lipid and cardiac markers', categories: ['Heart / Lipid'] },
      { key: 'cancer', label: 'Tumor & Cancer Screening', description: 'Tumour markers', categories: ['Cancer Markers'] },
      { key: 'pathology', label: 'General Pathology & Special Screenings', description: 'Specialised lab tests', categories: ['Pathology'] },
    ],
  },
];

export const ALL_CARDS: CategoryCard[] = LAB_SECTIONS.flatMap((s) => s.cards);
export const CARD_BY_KEY = new Map(ALL_CARDS.map((c) => [c.key, c]));

/** lower-cased category -> card key */
export const CARD_KEY_BY_CATEGORY = new Map(ALL_CARDS.flatMap((c) => c.categories.map((cat) => [cat.toLowerCase(), c.key] as const)));

export const ITEM_TYPES = ['PACKAGE', 'INDIVIDUAL_TEST'] as const;
export type LabItemType = (typeof ITEM_TYPES)[number];

// ---------------------------------------------------------------------------
// Package contents grouped into panels
// ---------------------------------------------------------------------------

/** Ordered: the first matching rule wins (e.g. HbA1c is "Diabetes", not "CBC"). */
const PANEL_RULES: { name: string; match: RegExp }[] = [
  { name: 'Urine Routine & Microscopy', match: /^urine\b/i },
  { name: 'Diabetes', match: /hba1c|glycated|glycosylated|blood sugar|glucose|\bfbs\b|\bppbs\b|insulin/i },
  { name: 'Lipid Profile', match: /cholesterol|triglycer|\bhdl\b|\bldl\b|vldl|apolipo|\bapo\s?(a1|b)\b/i },
  { name: 'Thyroid Profile', match: /thyro(?!xine binding)|\btsh\b|\bt3\b|\bt4\b|\bft3\b|\bft4\b|\btpo\b|thyroglobulin/i },
  { name: 'Iron Studies', match: /\biron\b|ferritin|transferrin|\btibc\b|\buibc\b/i },
  { name: 'Vitamins', match: /vitamin|folic acid/i },
  { name: 'Immunity Profile', match: /\bcd ?\d|immunoglobulin|complement|interleukin|\bil-6\b/i },
  { name: 'Liver Function Test (LFT)', match: /sgpt|sgot|bilirubin|alkaline phosphatase|\bprotein\b|albumin|(?<!immuno)globulin|a\/g ratio|gamma glutamyl|\bggt\b/i },
  { name: 'Kidney Function Test (KFT)', match: /creatinine|\bbun\b|\burea\b|uric acid|\begfr\b/i },
  { name: 'Electrolytes', match: /sodium|potassium|chloride/i },
  { name: 'Minerals', match: /calcium|zinc|phosph|magnesium/i },
  { name: 'Complete Blood Count (CBC)', match: /hemoglobin|haemoglobin|\bhb\b|blood cell|leukocyte|platelet|hematocrit|corpuscular|\bmpv\b|\bpdw\b|\brdw\b|neutrophil|lymphocyte|monocyte|eosinophil|basophil|\besr\b|\bcbc\b/i },
  { name: 'Hormones', match: /testosterone|prostate|\bpsa\b|luteinising|luteinizing|follicle stimulating|prolactin|estradiol|cortisol|\bamh\b|progesterone/i },
  { name: 'Infection Screening', match: /virus|\bhiv\b|hepatitis|hbsag|\bhcv\b|dengue|malaria|typhoid|widal|rubella|toxoplasma|cytomegalo|herpes|\bebv\b|mononucleosis|filaria|pylori|\bcrp\b|ra factor/i },
  { name: 'Autoimmune Markers', match: /antibod|\bana\b|ds-dna|scl-70|\bss-?[ab]\b|ssa-ro|ssb-la|jo-1|centromere|acpa|ra33|\brf igm\b|glycoprotein|smith|snrnp/i },
  { name: 'Cardiac Markers', match: /creatine kinase|troponin|homocysteine|lp\(a\)/i },
  { name: 'Pancreas', match: /amylase|lipase/i },
  { name: 'Coagulation', match: /prothrombin|thromboplastin|\binr\b/i },
  { name: 'Cancer Markers', match: /\bca ?125\b|cancer antigen|\bcea\b|\bafp\b/i },
];
/** How the panels are listed in a package (the most familiar ones first) */
const PANEL_ORDER = [
  'Complete Blood Count (CBC)',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Electrolytes',
  'Lipid Profile',
  'Thyroid Profile',
  'Diabetes',
  'Iron Studies',
  'Vitamins',
  'Minerals',
  'Hormones',
  'Cardiac Markers',
  'Pancreas',
  'Immunity Profile',
  'Infection Screening',
  'Autoimmune Markers',
  'Coagulation',
  'Cancer Markers',
  'Urine Routine & Microscopy',
  'Other Tests',
];

/** Entries that are scraping leftovers rather than tests */
const NOT_A_TEST = /^(frequently|samples required|preparations?|why is this test|log value)$/i;

export interface TestGroup {
  name: string;
  count: number;
  tests: string[];
}

/** The tests listed for an item, without blanks, duplicates and non-test entries. */
export function cleanTests(tests: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tests ?? []) {
    const t = raw?.trim();
    if (!t || NOT_A_TEST.test(t) || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

/**
 * "CBC (21 tests)", "LFT (11 tests)", ... for a package. When nothing matches a
 * known panel, everything is one group called "Tests included".
 */
export function groupTests(tests: string[]): TestGroup[] {
  const groups = new Map<string, string[]>();
  for (const t of cleanTests(tests)) {
    const name = PANEL_RULES.find((r) => r.match.test(t))?.name ?? 'Other Tests';
    groups.set(name, [...(groups.get(name) ?? []), t]);
  }
  if (groups.size === 1 && groups.has('Other Tests')) {
    const only = groups.get('Other Tests')!;
    return [{ name: 'Tests included', count: only.length, tests: only }];
  }
  return PANEL_ORDER.filter((n) => groups.has(n)).map((name) => ({ name, count: groups.get(name)!.length, tests: groups.get(name)! }));
}

/** Imported descriptions mention the source site's name; show our own name instead. */
export function brandText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.replace(/\b1\s?mg labs?\b/gi, 'Tabibistan Labs').replace(/\bon 1\s?mg\b/gi, 'on Tabibistan').trim() || null;
}
