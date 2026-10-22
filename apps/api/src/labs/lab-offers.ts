// What each approved lab charges for a test / package, shared by the patient
// lab picker (GET /patient/labs-for-test) and the catalog cards ("from Rs. X").
//
// A lab offers an item when it is APPROVED + verified, has at least one active
// branch, and has not switched the item off (LabPackagePrice.isAvailable=false).
// With no LabPackagePrice row the lab offers it at the master price, which is
// how the lab dashboard shows it too.

import { type Prisma } from '../generated/prisma/client.js';
import { type LabVerificationStatus } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export const APPROVED_LAB = { verificationStatus: 'APPROVED' as const, isVerified: true };
export const PATIENT_SELECTABLE_LAB = {
  verificationStatus: { in: ['APPROVED', 'PENDING'] as LabVerificationStatus[] },
};

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

export interface OfferLabOptions {
  /** Require an enabled LabPackagePrice row for every returned package/test. */
  requireAvailablePriceRow?: boolean;
  /** During development, show PENDING labs alongside APPROVED labs. */
  allowPendingVerification?: boolean;
}

/** Approved labs with active branches, and their price rows for these items */
export function loadOfferLabs(
  prisma: PrismaService,
  labPackageIds: string[],
  options: OfferLabOptions = {},
): Promise<OfferLab[]> {
  const where: Prisma.LaboratoryWhereInput = {
    ...(options.allowPendingVerification ? PATIENT_SELECTABLE_LAB : APPROVED_LAB),
    branches: { some: { isActive: true } },
    ...(options.requireAvailablePriceRow
      ? {
          prices: {
            some: {
              labPackageId: { in: labPackageIds },
              isAvailable: true,
            },
          },
        }
      : {}),
  };
  return prisma.laboratory.findMany({
    where,
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
export function offerOf(lab: OfferLab, item: OfferMaster, requireAvailablePriceRow = false) {
  if (lab.branches.length === 0) return null;
  const row = lab.prices.find((p) => p.labPackageId === item.id);
  if (row && !row.isAvailable) return null;
  if (requireAvailablePriceRow && (!row || !row.isAvailable)) {
    return null;
  }
  let prices = masterPrice(item);
  if (row?.customDiscountPrice != null) {
    const base = Math.round(row.customBasePrice ?? row.customDiscountPrice);
    prices = { offeredPrice: Math.round(row.customDiscountPrice), originalPrice: base };
  } else if (row?.customBasePrice != null) {
    const base = Math.round(row.customBasePrice);
    prices = { offeredPrice: base, originalPrice: base };
  }
  const discountPercent = prices.originalPrice > prices.offeredPrice ? Math.round(((prices.originalPrice - prices.offeredPrice) / prices.originalPrice) * 100) : 0;
  return {
    ...prices,
    discountPercent,
    customPrice: row?.customBasePrice != null || row?.customDiscountPrice != null,
    disabledSubTests: row?.disabledSubTests ?? [],
  };
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
