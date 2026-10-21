import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ALL_CARDS, CARD_BY_KEY, CARD_KEY_BY_CATEGORY, brandText, cleanTests } from '../lab-tests/lab-catalog.js';
import { UpdateLabPriceDto } from './dto/lab-pricing.dto.js';

/** Master catalog fields the dashboard needs (no long texts / FAQs) */
const ITEM_SELECT = {
  id: true,
  title: true,
  code: true,
  itemType: true,
  category: true,
  badgeText: true,
  basePrice: true,
  discountPrice: true,
  totalTestsCount: true,
  testsIncluded: true,
  aliases: true,
  isActive: true,
} as const;

const PRICE_SELECT = {
  customBasePrice: true,
  customDiscountPrice: true,
  isAvailable: true,
  disabledSubTests: true,
  updatedAt: true,
} as const;

interface ItemRow {
  id: string;
  title: string;
  code: string | null;
  itemType: string;
  category: string | null;
  badgeText: string | null;
  basePrice: number;
  discountPrice: number | null;
  totalTestsCount: number;
  testsIncluded: string[];
  aliases: string[];
  isActive: boolean;
}

interface PriceRow {
  customBasePrice: number | null;
  customDiscountPrice: number | null;
  isAvailable: boolean;
  disabledSubTests: string[];
  updatedAt: Date;
}

export interface LabPricingItem {
  id: string;
  title: string;
  code: string | null;
  itemType: 'PACKAGE' | 'INDIVIDUAL_TEST';
  category: string | null;
  /** category card key / label (Full Body Packages, Diabetes Tests, ...) */
  group: string | null;
  groupLabel: string | null;
  badgeText: string | null;
  aliases: string[];
  totalTestsCount: number;
  /** sub-test names for multi-test packages (empty otherwise) */
  subTests: string[];
  master: { basePrice: number; discountPrice: number | null };
  custom: { basePrice: number | null; discountPrice: number | null };
  hasCustomPrice: boolean;
  /** what patients of this lab pay */
  effective: { basePrice: number; price: number; discountPercent: number };
  isAvailable: boolean;
  disabledSubTests: string[];
  /** false when Tabibistan has hidden the item from the catalog */
  isActiveInCatalog: boolean;
  updatedAt: string | null;
}

const round = (n: number) => Math.round(n);

/** Effective pricing: custom base (+ optional custom discount) replaces the master pricing as a whole */
export function effectivePrice(master: { basePrice: number; discountPrice: number | null }, custom: { basePrice: number | null; discountPrice: number | null }) {
  const basePrice = round(custom.basePrice ?? master.basePrice);
  const price = round(custom.basePrice != null ? custom.discountPrice ?? custom.basePrice : master.discountPrice ?? master.basePrice);
  const discountPercent = basePrice > price ? Math.round(((basePrice - price) / basePrice) * 100) : 0;
  return { basePrice, price, discountPercent };
}

/** Sub-tests a lab can switch off: only packages listing more than one test */
export function subTestsOf(row: Pick<ItemRow, 'itemType' | 'testsIncluded'>): string[] {
  if (row.itemType !== 'PACKAGE') return [];
  const tests = cleanTests(row.testsIncluded ?? []);
  return tests.length > 1 ? tests : [];
}

export function toPricingItem(row: ItemRow, price: PriceRow | null | undefined): LabPricingItem {
  const subTests = subTestsOf(row);
  const subSet = new Set(subTests);
  const group = row.category ? CARD_KEY_BY_CATEGORY.get(row.category.trim().toLowerCase()) ?? null : null;
  const master = { basePrice: row.basePrice, discountPrice: row.discountPrice };
  const custom = { basePrice: price?.customBasePrice ?? null, discountPrice: price?.customDiscountPrice ?? null };
  return {
    id: row.id,
    title: brandText(row.title) ?? row.title,
    code: row.code,
    itemType: row.itemType === 'INDIVIDUAL_TEST' ? 'INDIVIDUAL_TEST' : 'PACKAGE',
    category: row.category,
    group,
    groupLabel: group ? CARD_BY_KEY.get(group)?.label ?? null : null,
    badgeText: brandText(row.badgeText),
    aliases: row.aliases ?? [],
    totalTestsCount: row.totalTestsCount,
    subTests,
    master,
    custom,
    hasCustomPrice: custom.basePrice != null,
    effective: effectivePrice(master, custom),
    isAvailable: price?.isAvailable ?? true,
    // names no longer in the package are ignored
    disabledSubTests: (price?.disabledSubTests ?? []).filter((n) => subSet.has(n)),
    isActiveInCatalog: row.isActive,
    updatedAt: price?.updatedAt ? price.updatedAt.toISOString() : null,
  };
}

@Injectable()
export class LabPricingService {
  constructor(private readonly prisma: PrismaService) {}

  private async getLab(laboratoryId: string) {
    const lab = await this.prisma.laboratory.findUnique({
      where: { id: laboratoryId },
      select: { id: true, name: true, logoUrl: true, verificationStatus: true, isVerified: true },
    });
    if (!lab) throw new NotFoundException('Laboratory not found.');
    return lab;
  }

  /** Whole master catalog with this lab's overrides (GET /lab-pricing/items) */
  async listItems(laboratoryId: string) {
    const laboratory = await this.getLab(laboratoryId);
    const rows = await this.prisma.labPackage.findMany({
      select: { ...ITEM_SELECT, labPrices: { where: { laboratoryId }, select: PRICE_SELECT, take: 1 } },
      orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
    });
    const items = rows.map((r) => toPricingItem(r, r.labPrices[0]));

    const groupCounts = new Map<string, number>();
    for (const it of items) if (it.group) groupCounts.set(it.group, (groupCounts.get(it.group) ?? 0) + 1);

    return {
      laboratory,
      summary: {
        total: items.length,
        packages: items.filter((i) => i.itemType === 'PACKAGE').length,
        tests: items.filter((i) => i.itemType === 'INDIVIDUAL_TEST').length,
        available: items.filter((i) => i.isAvailable && i.isActiveInCatalog).length,
        unavailable: items.filter((i) => !i.isAvailable).length,
        customPriced: items.filter((i) => i.hasCustomPrice).length,
        withDisabledSubTests: items.filter((i) => i.disabledSubTests.length > 0).length,
      },
      // categories for the filter, in the same order as the Lab Tests page
      groups: ALL_CARDS.filter((c) => groupCounts.has(c.key)).map((c) => ({ key: c.key, label: c.label, count: groupCounts.get(c.key)! })),
      items,
    };
  }

  /** Create or update this lab's price / availability for one item (PATCH /lab-pricing/items/:labPackageId) */
  async updateItem(labPackageId: string, dto: UpdateLabPriceDto) {
    await this.getLab(dto.laboratoryId);
    const row = await this.prisma.labPackage.findUnique({ where: { id: labPackageId }, select: ITEM_SELECT });
    if (!row) throw new NotFoundException('Test or package not found.');

    const where = { laboratoryId_labPackageId: { laboratoryId: dto.laboratoryId, labPackageId } };
    const existing = await this.prisma.labPackagePrice.findUnique({ where, select: PRICE_SELECT });

    // Prices: undefined = keep, null = back to master. Clearing the base price clears the discount too.
    let base = dto.customBasePrice !== undefined ? dto.customBasePrice : existing?.customBasePrice ?? null;
    let discount = dto.customDiscountPrice !== undefined ? dto.customDiscountPrice : existing?.customDiscountPrice ?? null;
    if (dto.customBasePrice === null && dto.customDiscountPrice === undefined) discount = null;
    if (base == null && discount != null) {
      throw new BadRequestException('Set a base price before setting a discounted price.');
    }
    if (base != null && discount != null && discount > base) {
      throw new BadRequestException('Discounted price cannot be higher than the base price.');
    }
    if (base != null && discount === base) discount = null; // same as no discount

    // Sub-tests: only names of this package; at least one must stay on
    let disabled = existing?.disabledSubTests ?? [];
    if (dto.disabledSubTests !== undefined) {
      const subTests = subTestsOf(row);
      if (dto.disabledSubTests.length > 0 && subTests.length === 0) {
        throw new BadRequestException('Only packages with more than one test have sub-tests to switch off.');
      }
      const known = new Set(subTests);
      const unknown = dto.disabledSubTests.filter((n) => !known.has(n));
      if (unknown.length > 0) {
        throw new BadRequestException(`These tests are not part of this package: ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? ', ...' : ''}`);
      }
      if (subTests.length > 0 && dto.disabledSubTests.length >= subTests.length) {
        throw new BadRequestException('Keep at least one test switched on, or mark the whole package as unavailable.');
      }
      disabled = subTests.filter((n) => dto.disabledSubTests!.includes(n)); // package order
    }

    const data = {
      customBasePrice: base,
      customDiscountPrice: discount,
      isAvailable: dto.isAvailable ?? existing?.isAvailable ?? true,
      disabledSubTests: disabled,
    };
    const saved = await this.prisma.labPackagePrice.upsert({
      where,
      create: { laboratoryId: dto.laboratoryId, labPackageId, ...data },
      update: data,
      select: PRICE_SELECT,
    });
    return toPricingItem(row, saved);
  }
}
