import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createWorker } from 'tesseract.js';

// Medical Stop Words Filter
const STOP = new Set([
  'tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules',
  'syp', 'syrup', 'syrups', 'inj', 'injection', 'injections', 'cream', 'creams',
  'gel', 'gels', 'lotion', 'oil', 'drops', 'drop', 'spray', 'ointment', 'powder',
  'solution', 'suspension', 'shampoo', 'soap', 'wash', 'serum', 'pack', 'packs',
  'sachet', 'sachets', 'inhaler', 'evohaler', 'accuhaler',
  'mg', 'ml', 'gm', 'g', 'mcg', 'iu', 'tds', 'bd', 'od', 'hs', 'sos', 'stat',
  'daily', 'once', 'twice', 'thrice', 'after', 'before', 'food', 'meals',
  'morning', 'evening', 'night', 'day', 'days', 'week', 'weeks', 'month', 'months',
  'take', 'use', 'apply', 'qty', 'quantity', 'sig', 'rx', 'prescription',
  'medicine', 'medicines', 'dr', 'doctor', 'patient', 'name', 'date', 'age',
  'sex', 'male', 'female', 'pharmacy', 'hospital', 'clinic', 'and', 'with',
  'for', 'the', 'from', 'plus', 'extra', 'advanced', 'original', 'local',
  'formula', 'complex', 'support', 'care', 'health', 'skin', 'hair', 'body',
  'face', 'oral', 'baby', 'men', 'women', 'type', 'test', 'check', 'operator',
  'monitor', 'sir', 'tabibistan', 'style', 'generic', 'advice', 'diagnosis',
  'avoid', 'wear', 'underwear', 'cotton', 'inhalation', 'steam', 'plenty', 'fluids',
  'breastfeeding', 'danger', 'signs', 'fomentation', 'bearing', 'physiotherapy',
  'sips', 'frequent', 'weight', 'consultant', 'physician', 'center', 'centre'
]);

const OCR_FIX: Array<[RegExp, string]> = [
  [/\bzine\s+sulphate\b/gi, 'zinc sulphate'],
  [/\bzine\b/gi, 'zinc'],
  [/\bglucophad[e]?\b/gi, 'glucophage'],
  [/\bamari[l1]\b/gi, 'amaryl'],
  [/\bjanuva\b/gi, 'januvia'],
  [/\bpanado[l10]\b/gi, 'panadol'],
  [/\bbrufe[n1]\b/gi, 'brufen'],
  [/\bponsta[n1]\b/gi, 'ponstan'],
  [/\bcalpo[l10]\b/gi, 'calpol'],
  [/\bflagy[l10]\b/gi, 'flagyl'],
  [/\bmotillium\b/gi, 'motilium'],
  [/\baugmeutin\b/gi, 'augmentin'],
  [/\bthiocolchicoside\s*["“]?\s*hmg\b/gi, 'thiocolchicoside 4mg'],
  [/\bthiocolchicoside\s*["“]?\s*(\d+)mg\b/gi, 'thiocolchicoside $1mg'],
  [/5m[!1|]\b/gi, '5ml'],
  [/\b(\d+)m[!1|]\b/gi, '$1ml'],
  [/\b(\d+)\s*(tab|cap|syp|puff)/gi, '$1 $2'],
  [/\bwash\s+intimate\s+wash\b/gi, 'v wash intimate wash'],
  [/\bintimate\s+wash\b/gi, 'v wash intimate wash'],
  [/\bwho\s+formula\b/gi, 'who formula ors'],
  [/\benterogermina\b/gi, 'enterogermina probiotic'],
  [/\bcipro\b/gi, 'cipro ciprofloxacin ciproxin'],
];

const MEDICAL_ALIASES: Array<{ trigger: RegExp; targets: string[] }> = [
  { trigger: /\bcipro(floxacin|xin)?\b/i, targets: ['ciprofloxacin', 'ciproxin', 'ciplox'] },
  { trigger: /\bventolin\b/i, targets: ['salbutamol', 'ventolin'] },
  { trigger: /\bpanadol\b/i, targets: ['paracetamol', 'panadol', 'calpol'] },
  { trigger: /\bcalpol\b/i, targets: ['paracetamol', 'calpol', 'panadol'] },
  { trigger: /\bbrufen\b/i, targets: ['ibuprofen', 'brufen'] },
  { trigger: /\baugmentin\b/i, targets: ['augmentin', 'amoxicillin', 'clavulanic'] },
  { trigger: /\bamoxil\b/i, targets: ['amoxicillin', 'amoxil'] },
  { trigger: /\bflagyl\b/i, targets: ['metronidazole', 'flagyl'] },
  { trigger: /\benterogermina\b/i, targets: ['enterogermina', 'probiotic', 'lactobacillus'] },
  { trigger: /\bors\b/i, targets: ['ors', 'oral rehydration salt', 'pedialyte'] },
  { trigger: /\bcanesten\b/i, targets: ['canesten', 'clotrimazole'] },
  { trigger: /\bfluconazole\b/i, targets: ['fluconazole', 'diflucan', 'flucon'] },
  { trigger: /\bdiflucan\b/i, targets: ['fluconazole', 'diflucan'] },
  { trigger: /\brisek\b/i, targets: ['omeprazole', 'risek'] },
  { trigger: /\bnexium\b/i, targets: ['esomeprazole', 'nexium'] },
  { trigger: /\bzyrtec\b/i, targets: ['cetirizine', 'zyrtec'] },
  { trigger: /\btelfast\b/i, targets: ['fexofenadine', 'telfast'] },
  { trigger: /\bvolini|voltaren\b/i, targets: ['diclofenac', 'volini', 'voltaren'] },
  { trigger: /\bmuscoril|muscoflex\b/i, targets: ['thiocolchicoside', 'muscoril', 'muscoflex'] },
  { trigger: /\bvwash|v\s*wash|intimate\s*wash\b/i, targets: ['vwash', 'v wash', 'intimate wash'] },
  { trigger: /\blinkus\b/i, targets: ['linkus', 'ivy leaf'] },
  { trigger: /\bglucophage\b/i, targets: ['metformin', 'glucophage'] },
  { trigger: /\bamaryl\b/i, targets: ['glimepiride', 'amaryl'] },
  { trigger: /\bjanuvia\b/i, targets: ['sitagliptin', 'januvia'] },
  { trigger: /\bbuscopan\b/i, targets: ['buscopan', 'hyoscine'] },
  { trigger: /\bnuberol\b/i, targets: ['paracetamol', 'orphenadrine', 'nuberol'] },
];

type ProductRow = {
  id: string;
  name: string;
  brandName?: string | null;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  isFeatured?: boolean | null;
  price?: number | null;
};

function cleanString(str?: string | null): string {
  let s = (str || '').toLowerCase().replace(/&/g, ' and ');
  for (const [re, to] of OCR_FIX) s = s.replace(re, to);
  return s.replace(/[^\w\s.%/+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractStrengths(text: string): Array<{ num: string; unit: string; raw: string }> {
  const out: Array<{ num: string; unit: string; raw: string }> = [];
  const re = /(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu|%|spf)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ num: m[1], unit: m[2].toLowerCase(), raw: `${m[1]}${m[2].toLowerCase()}` });
  }
  return out;
}

function extractDosageForms(text: string): string[] {
  const forms: string[] = [];
  const re = /\b(tablet|tablets|tabs?|capsule|capsules|caps?|syrup|syrups?|suspension|drops?|cream|gel|lotion|ointment|inhaler|evohaler|accuhaler|sachet|sachets|patch|injection|injections?|wash)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const word = m[1].toLowerCase();
    if (word.startsWith('tab')) forms.push('tablet');
    else if (word.startsWith('cap')) forms.push('capsule');
    else if (word.startsWith('syp') || word.startsWith('syrup') || word.startsWith('susp')) forms.push('syrup');
    else if (word.startsWith('inhal') || word.startsWith('evoh')) forms.push('inhaler');
    else if (word.startsWith('drop')) forms.push('drops');
    else if (word.startsWith('cream')) forms.push('cream');
    else if (word.startsWith('gel')) forms.push('gel');
    else if (word.startsWith('sachet')) forms.push('sachet');
    else if (word.startsWith('wash')) forms.push('wash');
  }
  return [...new Set(forms)];
}

function isPrescriptionLine(line: string): boolean {
  const l = line.trim().toLowerCase();
  if (l.length < 4) return false;

  // Ignore header/footer non-medicine lines
  if (/^(dr\.|doctor|patient|age|sex|gender|diagnosis|date|clinic|hospital|advice|signature|reg\.?\s*no|mbbs|fcps|mcps|bds)/i.test(l)) {
    return false;
  }
  if (/(steam inhalation|wear cotton|plenty of fluids|breastfeeding|hot fomentation|avoid sugar|physiotherapy)/i.test(l)) {
    return false;
  }

  // Numbered prescription items: "1.", "2 ", "3)", "RB 1.", "x Aceclofenac", "a Cipro", "25 Enterogermina"
  if (/^([0-9]+[\.\)\s]|[a-z][\.\)]|rb\s*[0-9]+|rx|[x*•\-])/i.test(l)) {
    return true;
  }

  // Lines with medical dosage indicators
  if (/\b(\d+\s*(mg|ml|mcg|iu|%|g)|tab|cap|syp|drops?|cream|gel|inhaler|sachet|puff|puffs|sos|od|bd|tds|hs|daily)\b/i.test(l)) {
    return true;
  }

  return false;
}

function cleanPrescriptionLine(line: string): string {
  let s = line;
  for (const [re, to] of OCR_FIX) {
    s = s.replace(re, to);
  }
  // Strip item numbering at start: "1. ", "2 ", "RB 1. ", "x ", "a ", "25 "
  s = s.replace(/^(?:rb\s*)?(?:[0-9]{1,2}|[a-z]|[x*•\-])[\.\)\s-]+/i, '');
  return cleanString(s);
}

function tokenizeLine(line: string): string[] {
  const words = cleanString(line).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  return words;
}

export function matchProductsFromText(rawText: string, products: ProductRow[]) {
  if (!rawText || rawText.trim().length < 3) return [];

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let rxLines = rawLines.filter(isPrescriptionLine);

  // Fallback: If no structured lines detected, treat every non-empty line as potential
  if (rxLines.length === 0) {
    rxLines = rawLines.filter((l) => l.length >= 4 && !/^(dr\.|date|age|patient|clinic)/i.test(l));
  }

  const matchedHits: Array<{ product: ProductRow; score: number; reason: string; matchedOn: string }> = [];
  const assignedProductIds = new Set<string>();

  for (const rawLine of rxLines) {
    const cleanedLine = cleanPrescriptionLine(rawLine);
    const lineStrengths = extractStrengths(rawLine);
    const lineForms = extractDosageForms(rawLine);
    const lineTokens = tokenizeLine(cleanedLine);

    if (lineTokens.length === 0 && lineStrengths.length === 0) continue;

    // Find any triggered target aliases
    const targetKeywords = new Set<string>(lineTokens);
    for (const alias of MEDICAL_ALIASES) {
      if (alias.trigger.test(cleanedLine) || alias.trigger.test(rawLine)) {
        for (const t of alias.targets) targetKeywords.add(t);
      }
    }

    const isBabyPrescription = /\b(baby|pediatric|child|infant)\b/i.test(rawLine);
    const isPregnancyPrescription = /\b(pregnancy|maternal|pregnant)\b/i.test(rawLine);

    let bestMatch: ProductRow | null = null;
    let highestScore = 0;
    let bestReason = '';
    let bestMatchedOn = '';

    for (const product of products) {
      if (assignedProductIds.has(product.id)) continue;

      const pName = cleanString(product.name);
      const pGeneric = cleanString(product.genericName);
      const pBrand = cleanString(product.brandName);

      let score = 0;
      const reasons: string[] = [];
      const matchedTerms: string[] = [];

      // 1. Direct Keyword / Brand / Generic Matches
      for (const kw of targetKeywords) {
        if (kw.length < 3 || STOP.has(kw)) continue;

        const re = new RegExp(`(?:^|\\s)${kw}(?:\\s|$)`, 'i');
        if (re.test(pName)) {
          score += (kw.length > 5 ? 60 : 50);
          matchedTerms.push(kw);
          reasons.push(`Name matched "${kw}"`);
        } else if (re.test(pBrand)) {
          score += 45;
          matchedTerms.push(kw);
          reasons.push(`Brand matched "${kw}"`);
        } else if (re.test(pGeneric)) {
          score += 40;
          matchedTerms.push(kw);
          reasons.push(`Generic matched "${kw}"`);
        }
      }

      if (score === 0) continue;

      // 2. Multi-ingredient / Combination Match Bonus
      if (matchedTerms.length >= 2) {
        score += 35;
        reasons.push('Multi-ingredient combination match');
      }

      // 3. Exact Strength Match Bonus
      const pStrengths = extractStrengths(`${product.strength || ''} ${product.name} ${product.genericName || ''}`);
      if (lineStrengths.length > 0 && pStrengths.length > 0) {
        const hasStrengthMatch = lineStrengths.some((ls) =>
          pStrengths.some((ps) => ps.num === ls.num && ps.unit === ls.unit),
        );
        if (hasStrengthMatch) {
          score += 30;
          reasons.push('Exact strength match');
        }
      }

      // 4. Dosage Form Match Bonus
      const pForms = extractDosageForms(`${product.dosageForm || ''} ${product.name}`);
      if (lineForms.length > 0 && pForms.length > 0) {
        const hasFormMatch = lineForms.some((lf) => pForms.includes(lf));
        if (hasFormMatch) {
          score += 20;
          reasons.push('Dosage form match');
        }
      }

      // 5. Formulation demographic matching penalties
      if (!isBabyPrescription && /\b(baby|pediatric|child|infant)\b/i.test(pName)) {
        score -= 25;
      }
      if (!isPregnancyPrescription && /\b(pregnancy|maternal|pregnant)\b/i.test(pName)) {
        score -= 30;
      }
      if (isBabyPrescription && /\b(pediatric|baby|drops|syrup)\b/i.test(pName)) {
        score += 25;
      }

      if (score > highestScore && score >= 50) {
        highestScore = score;
        bestMatch = product;
        bestReason = reasons.join(', ');
        bestMatchedOn = matchedTerms.join(' + ');
      }
    }

    if (bestMatch && highestScore >= 50) {
      assignedProductIds.add(bestMatch.id);
      matchedHits.push({
        product: bestMatch,
        score: highestScore,
        reason: bestReason,
        matchedOn: bestMatchedOn,
      });
    }
  }

  // Sort by score descending and return top matches
  matchedHits.sort((a, b) => b.score - a.score);
  return matchedHits.slice(0, 10);
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrescription(userId: string, file: Express.Multer.File) {
    return this.prisma.prescription.create({
      data: {
        userId,
        fileName: file.originalname,
        fileUrl: `/uploads/prescriptions/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
  }

  async getUserPrescriptions(userId: string, unattachedOnly = false) {
    return this.prisma.prescription.findMany({
      where: { userId, ...(unattachedOnly ? { orderId: null } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, userId },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async deletePrescription(id: string, userId: string) {
    await this.getPrescription(id, userId);
    return this.prisma.prescription.delete({ where: { id } });
  }

  // Upload + Analyze
  async analyzePrescription(userId: string, file: Express.Multer.File) {
    const prescription = await this.createPrescription(userId, file);

    let extractedText = '';
    try {
      if (file.mimetype.startsWith('image/')) {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(file.path);
        extractedText = ret.data.text || '';
        await worker.terminate();
      }
    } catch (error) {
      console.error('Prescription OCR Analysis Error:', error);
    }

    const products = await this.prisma.product.findMany();
    const ranked = matchProductsFromText(extractedText, products as ProductRow[]);

    return {
      prescription,
      extractedText,
      detectedProducts: ranked.map((h) => h.product),
      matchMeta: ranked.map((h) => ({
        id: h.product.id,
        score: h.score,
        reason: h.reason,
        matchedOn: h.matchedOn,
      })),
    };
  }

  // 👈 NAYA METHOD: Pehle se stored prescription ko DB row create kiye bina analyze karna
  async analyzeExistingPrescription(id: string, userId: string) {
    const prescription = await this.getPrescription(id, userId);

    let extractedText = '';
    try {
      const filePath = `.${prescription.fileUrl}`;
      if (prescription.fileType?.startsWith('image/')) {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        extractedText = ret.data.text || '';
        await worker.terminate();
      }
    } catch (error) {
      console.error('Prescription OCR Analysis Error:', error);
    }

    const products = await this.prisma.product.findMany();
    const ranked = matchProductsFromText(extractedText, products as ProductRow[]);

    return {
      prescription,
      extractedText,
      detectedProducts: ranked.map((h) => h.product),
      matchMeta: ranked.map((h) => ({
        id: h.product.id,
        score: h.score,
        reason: h.reason,
        matchedOn: h.matchedOn,
      })),
    };
  }
}