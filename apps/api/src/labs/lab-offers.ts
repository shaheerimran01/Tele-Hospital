// What each approved lab charges for a test / package, shared by the patient
// lab picker (GET /patient/labs-for-test) and the catalog cards ("from Rs. X").
//
// A lab offers an item when it is APPROVED + verified, has at least one active
// branch, and has not switched the item off (LabPackagePrice.isAvailable=false).
// With no LabPackagePrice row the lab offers it at the master price, which is
// how the lab dashboard shows it too.

import type { PrismaService } from '../prisma/prisma.service.js';

export const APPROVED_LAB = { verificationStatus: 'APPROVED' as const, isVerified: true };

export const OFFER_BRANCH_SELECT = { id: true, name: true, address: true, phone: true, latitude: true, longitude: true, isMainCenter: true } as const;

export interface OfferMaster {
  id: string;
  basePrice: number;
  discountPrice: number | null;
}

interface PriceRow {
  labPackageId: string;
  customBasePrice: number | null;
  customDiscountPrice: number | null;
  isAvailable: boolean;
  disabledSubTests: string[];
}

export interface OfferLab {
  id: string;
  name: string;
  logoUrl: string | null;
  hasHomeSample: boolean;
  homeSampleFee: number | null;
  branches: { id: string; name: string; address: string; phone: string | null; latitude: number | null; longitude: number | null; isMainCenter: boolean }[];
  prices: PriceRow[];
}

/** Approved labs with active branches, and their price rows for these items */
export function loadOfferLabs(prisma: PrismaService, labPackageIds: string[]): Promise<OfferLab[]> {
  return prisma.laboratory.findMany({
    where: { ...APPROVED_LAB, branches: { some: { isActive: true } } },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      hasHomeSample: true,
      homeSampleFee: true,
      branches: { where: { isActive: true }, select: OFFER_BRANCH_SELECT, orderBy: [{ isMainCenter: 'desc' }, { createdAt: 'asc' }] },
      prices: {
        where: { labPackageId: { in: labPackageIds } },
        select: { labPackageId: true, customBasePrice: true, customDiscountPrice: true, isAvailable: true, disabledSubTests: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/** Master price: a discount counts only when it is below the base price (same rule as the catalog) */
export function masterPrice(m: Pick<OfferMaster, 'basePrice' | 'discountPrice'>) {
  const price = m.discountPrice != null && m.discountPrice > 0 && m.discountPrice < m.basePrice ? m.discountPrice : m.basePrice;
  return { offeredPrice: Math.round(price), originalPrice: Math.round(m.basePrice) };
}

/** The lab's price for one item, or null when the lab does not offer it */
export function offerOf(lab: OfferLab, item: OfferMaster) {
  if (lab.branches.length === 0) return null;
  const row = lab.prices.find((p) => p.labPackageId === item.id);
  if (row && !row.isAvailable) return null;
  let prices = masterPrice(item);
  if (row?.customBasePrice != null) {
    const base = Math.round(row.customBasePrice);
    const offered = row.customDiscountPrice != null && row.customDiscountPrice < row.customBasePrice ? Math.round(row.customDiscountPrice) : base;
    prices = { offeredPrice: offered, originalPrice: base };
  }
  const discountPercent = prices.originalPrice > prices.offeredPrice ? Math.round(((prices.originalPrice - prices.offeredPrice) / prices.originalPrice) * 100) : 0;
  return { ...prices, discountPercent, customPrice: row?.customBasePrice != null, disabledSubTests: row?.disabledSubTests ?? [] };
}

/** For catalog cards: how many labs offer each item and the lowest price */
export async function offerSummaries(prisma: PrismaService, items: OfferMaster[]) {
  const out = new Map<string, { labsCount: number; fromPrice: number | null }>();
  if (items.length === 0) return out;
  const labs = await loadOfferLabs(prisma, items.map((i) => i.id));
  for (const item of items) {
    const prices = labs.map((l) => offerOf(l, item)?.offeredPrice).filter((p): p is number => p != null);
    out.set(item.id, { labsCount: prices.length, fromPrice: prices.length ? Math.min(...prices) : null });
  }
  return out;
}

/** Great-circle distance in km (Haversine) */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
