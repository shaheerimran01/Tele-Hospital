import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createWorker } from 'tesseract.js';

// Medical Stop Words Filter
const STOP = new Set([
  'tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules',
  'syp', 'syrup', 'syrups', 'inj', 'injection', 'injections', 'cream', 'creams', 'gel',
  'gels', 'lotion', 'oil', 'drops', 'drop', 'spray', 'ointment', 'powder', 'solution',
  'suspension', 'shampoo', 'soap', 'wash', 'serum', 'pack', 'packs', 'sachet', 'sachets',
  'mg', 'ml', 'gm', 'g', 'mcg', 'iu', 'tds', 'bd', 'od', 'hs', 'sos', 'stat', 'daily',
  'once', 'twice', 'thrice', 'after', 'before', 'food', 'meals', 'morning', 'evening',
  'night', 'day', 'days', 'week', 'weeks', 'month', 'months', 'take', 'use', 'apply',
  'qty', 'quantity', 'sig', 'rx', 'prescription', 'medicine', 'medicines', 'dr', 'doctor',
  'patient', 'name', 'date', 'age', 'sex', 'male', 'female', 'pharmacy', 'hospital', 'clinic',
  'and', 'with', 'for', 'the', 'from', 'plus', 'extra', 'advanced', 'original', 'local',
  'formula', 'complex', 'support', 'care', 'health', 'skin', 'hair', 'body', 'face', 'oral',
  'baby', 'men', 'women', 'type', 'test', 'check', 'operator', 'monitor', 'sir', 'tabibistan',
  'style', 'generic',
]);

const OCR_FIX: Array<[RegExp, string]> = [
  [/accu[\s-]?chek/gi, 'accu chek'],
  [/glucophad[e]?/gi, 'glucophage'],
  [/amari[l]?/gi, 'amaryl'],
  [/januva\b/gi, 'januvia'],
  [/panado[l10]\b/gi, 'panadol'],
  [/brufe[n1]\b/gi, 'brufen'],
  [/ponsta[n1]\b/gi, 'ponstan'],
  [/calpo[l10]\b/gi, 'calpol'],
  [/flagy[l10]\b/gi, 'flagyl'],
  [/motillium/gi, 'motilium'],
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

function normalizeText(raw: string): string {
  let s = raw.toLowerCase().replace(/&/g, ' and ');
  for (const [re, to] of OCR_FIX) s = s.replace(re, to);
  return s.replace(/[^a-z0-9.%/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExactPhrase(haystack: string, phrase: string): boolean {
  const p = normalizeText(phrase);
  if (p.length < 3) return false;
  return new RegExp(`(?:^|\\s)${escapeRegex(p)}(?:\\s|$)`).test(haystack);
}

function extractDrugTradeName(productName: string): string {
  const clean = productName
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\d+(?:\.\d+)?\s*(mg|ml|mcg|g|iu|%|spf|gm|sachets|tablets|capsules|pack)/gi, ' ')
    .replace(/\b(tablets?|capsules?|syrup|injection|suspension|drops?|sachet|cream|gel|lotion|ointment|solution|pack|forte|ds)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  if (words.length === 0) return '';
  return words.slice(0, 2).join(' ');
}

function extractStrengths(text: string): Array<{ num: string; unit: string }> {
  const out: Array<{ num: string; unit: string }> = [];
  const re = /(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu|%|spf)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ num: m[1], unit: m[2].toLowerCase() });
  }
  return out;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 99;

  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[a.length];
}

export function matchProductsFromText(rawText: string, products: ProductRow[]) {
  const hay = ` ${normalizeText(rawText)} `;
  if (hay.trim().length < 3) return [];

  const rxTokens = normalizeText(rawText)
    .split(' ')
    .filter((w) => w.length >= 5 && !STOP.has(w));

  const rxStrengths = extractStrengths(rawText);
  const hits: Array<{ product: ProductRow; score: number; reason: string; matchedOn: string }> = [];

  for (const product of products) {
    const tradeName = extractDrugTradeName(product.name);
    if (!tradeName || tradeName.length < 3) continue;

    const firstWord = tradeName.split(' ')[0];
    const genericName = normalizeText(product.genericName || '');

    let score = 0;
    let reason = '';
    let matchedOn = '';

    if (hasExactPhrase(hay, tradeName)) {
      score = tradeName.includes(' ') ? 110 : 100;
      reason = 'Exact Trade Name Match';
      matchedOn = tradeName;
    } else if (firstWord.length >= 4 && hasExactPhrase(hay, firstWord)) {
      score = 90;
      reason = 'Trade Brand Word Match';
      matchedOn = firstWord;
    }

    if (score === 0 && genericName.length >= 5 && !STOP.has(genericName)) {
      if (hasExactPhrase(hay, genericName)) {
        score = 80;
        reason = 'Generic Chemical Match';
        matchedOn = genericName;
      }
    }

    if (score === 0 && firstWord.length >= 5) {
      for (const token of rxTokens) {
        if (levenshteinDistance(firstWord, token) <= 1) {
          score = 75;
          reason = 'Fuzzy OCR Match';
          matchedOn = `${token} → ${firstWord}`;
          break;
        }
      }
    }

    if (score === 0) continue;

    const productStrengths = extractStrengths(
      `${product.strength || ''} ${product.name} ${product.genericName || ''}`,
    );

    if (rxStrengths.length > 0 && productStrengths.length > 0) {
      const isExactStrengthMatch = productStrengths.some((ps) =>
        rxStrengths.some((rs) => ps.num === rs.num && ps.unit === rs.unit),
      );
      if (isExactStrengthMatch) {
        score += 25;
      }
    }

    if (score < 75) continue;

    hits.push({ product, score, reason, matchedOn });
  }

  hits.sort((a, b) => b.score - a.score);

  const byFamily = new Map<string, typeof hits>();
  for (const h of hits) {
    const family = extractDrugTradeName(h.product.name).split(' ')[0] || h.product.id;
    const list = byFamily.get(family) ?? [];
    list.push(h);
    byFamily.set(family, list);
  }

  const picked: typeof hits = [];
  for (const group of byFamily.values()) {
    picked.push(group[0]);
  }

  picked.sort((a, b) => b.score - a.score);
  return picked.slice(0, 8);
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