import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  ALL_CARDS,
  brandText,
  CARD_BY_KEY,
  CARD_KEY_BY_CATEGORY,
  cleanTests,
  groupTests,
  LAB_SECTIONS,
  type CategoryCard,
} from './lab-catalog.js';
import type { ListLabItemsQueryDto } from './dto/lab-tests.dto.js';

const DEFAULT_PAGE_SIZE = 24;

const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  code: true,
  itemType: true,
  category: true,
  badgeText: true,
  basePrice: true,
  discountPrice: true,
  discountPercent: true,
  totalTestsCount: true,
  testsIncluded: true,
  reportTime: true,
  sampleRequired: true,
  preparation: true,
  targetGender: true,
  isPopular: true,
} satisfies Prisma.LabPackageSelect;

type ListRow = Prisma.LabPackageGetPayload<{ select: typeof LIST_SELECT }>;

/** Category values of a card, matched without regard to case */
function categoryWhere(card: CategoryCard): Prisma.LabPackageWhereInput {
  return { OR: card.categories.map((c) => ({ category: { equals: c, mode: 'insensitive' as const } })) };
}

/** Price the patient pays, the crossed-out price and the saving */
function pricing(r: { basePrice: number; discountPrice: number | null; discountPercent: number | null }) {
  const price = r.discountPrice != null && r.discountPrice > 0 && r.discountPrice < r.basePrice ? r.discountPrice : r.basePrice;
  const percent = price < r.basePrice ? r.discountPercent ?? Math.round((1 - price / r.basePrice) * 100) : 0;
  return { price, mrp: r.basePrice, discountPercent: percent > 0 ? percent : 0 };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** FAQs are stored as JSON: [{ question, answer }] (or { q, a }) */
function readFaqs(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f) => {
      const o = (f ?? {}) as Record<string, unknown>;
      const question = String(o.question ?? o.q ?? '').trim();
      const answer = String(o.answer ?? o.a ?? '').trim();
      return question && answer ? { question: brandText(question)!, answer: brandText(answer)! } : null;
    })
    .filter((f): f is FaqEntry => f !== null);
}

@Injectable()
export class LabTestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /lab-tests/catalog: the 4 sections with live counts per card */
  async catalog() {
    const rows = await this.prisma.labPackage.groupBy({
      by: ['category', 'itemType'],
      where: { isActive: true },
      _count: { _all: true },
      _min: { discountPrice: true, basePrice: true },
    });

    const stats = new Map<string, { packages: number; tests: number; fromPrice: number | null }>();
    let unlisted = 0;
    for (const r of rows) {
      const key = CARD_KEY_BY_CATEGORY.get((r.category ?? '').trim().toLowerCase());
      if (!key) {
        unlisted += r._count._all;
        continue;
      }
      const s = stats.get(key) ?? { packages: 0, tests: 0, fromPrice: null };
      if (r.itemType === 'PACKAGE') s.packages += r._count._all;
      else s.tests += r._count._all;
      const min = r._min.discountPrice ?? r._min.basePrice;
      if (min != null && min > 0) s.fromPrice = s.fromPrice == null ? min : Math.min(s.fromPrice, min);
      stats.set(key, s);
    }

    const totals = { all: 0, packages: 0, tests: 0 };
    const sections = LAB_SECTIONS.map((section) => ({
      id: section.id,
      title: section.title,
      shortcut: section.shortcut ?? null,
      cards: section.cards.map((card) => {
        const s = stats.get(card.key) ?? { packages: 0, tests: 0, fromPrice: null };
        totals.packages += s.packages;
        totals.tests += s.tests;
        return {
          key: card.key,
          label: card.label,
          description: card.description,
          count: s.packages + s.tests,
          packages: s.packages,
          tests: s.tests,
          fromPrice: s.fromPrice,
        };
      }),
    }));
    totals.all = totals.packages + totals.tests;
    /** active items whose category isn't on any card (not shown on the page) */
    return { sections, totals, unlisted };
  }

  /** GET /lab-tests: one card's items (or a search), with counts for the type filter */
  async list(query: ListLabItemsQueryDto) {
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const card = query.group ? CARD_BY_KEY.get(query.group) : undefined;
    const search = query.search?.trim();

    const base: Prisma.LabPackageWhereInput[] = [{ isActive: true }];
    if (card) base.push(categoryWhere(card));
    else base.push({ OR: ALL_CARDS.map(categoryWhere) }); // only what the page can show
    if (search) {
      // Every word must appear ("x-ray chest" finds "Chest X Ray PA View")
      const words = search.toLowerCase().replace(/[-_/,()]+/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6);
      base.push({
        OR: [
          {
            AND: words.map((w) => ({
              OR: [
                { title: { contains: w, mode: 'insensitive' as const } },
                { code: { contains: w, mode: 'insensitive' as const } },
                { category: { contains: w, mode: 'insensitive' as const } },
              ],
            })),
          },
          { aliases: { has: search } },
          { testsIncluded: { has: search } },
        ],
      });
    }
    const where: Prisma.LabPackageWhereInput = {
      AND: [...base, ...(query.type ? [{ itemType: query.type }] : [])],
    };

    const orderBy: Prisma.LabPackageOrderByWithRelationInput[] =
      query.sort === 'price-asc'
        ? [{ discountPrice: 'asc' }, { basePrice: 'asc' }, { title: 'asc' }]
        : query.sort === 'price-desc'
          ? [{ discountPrice: 'desc' }, { basePrice: 'desc' }, { title: 'asc' }]
          : // popular first, packages before single tests, then by name
            [{ isPopular: 'desc' }, { itemType: 'desc' }, { title: 'asc' }];

    const [total, packages, tests] = await Promise.all([
      this.prisma.labPackage.count({ where }),
      this.prisma.labPackage.count({ where: { AND: [...base, { itemType: 'PACKAGE' }] } }),
      this.prisma.labPackage.count({ where: { AND: [...base, { itemType: 'INDIVIDUAL_TEST' }] } }),
    ]);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(query.page ?? 1, pages);
    const items = await this.prisma.labPackage.findMany({
      where,
      select: LIST_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      group: card ? { key: card.key, label: card.label } : null,
      search: search ?? null,
      type: query.type ?? null,
      /** counts for "All Items | Health Packages Only | Individual Tests Only" */
      counts: { all: packages + tests, packages, tests },
      total,
      page,
      pageSize,
      pages,
      items: items.map((r) => this.listItem(r)),
    };
  }

  /** GET /lab-tests/:slug: everything for the details modal, with the tests grouped into panels */
  async findOne(slugOrId: string) {
    const r = await this.prisma.labPackage.findFirst({
      where: { isActive: true, OR: [{ slug: slugOrId }, { id: slugOrId }] },
    });
    if (!r) throw new NotFoundException('This test is no longer available');
    const tests = cleanTests(r.testsIncluded);
    return {
      ...this.listItem(r),
      aliases: (r.aliases ?? []).filter(Boolean),
      overview: brandText(r.overview),
      whyBooked: brandText(r.whyBooked),
      whatItMeasures: brandText(r.whatItMeasures),
      notes: brandText(r.notes),
      faqs: readFaqs(r.faqs),
      /** e.g. [{ name: "Complete Blood Count (CBC)", count: 21, tests: [...] }] */
      testGroups: r.itemType === 'PACKAGE' ? groupTests(tests) : [],
      tests,
    };
  }

  private listItem(r: ListRow) {
    const tests = cleanTests(r.testsIncluded);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      code: r.code,
      itemType: r.itemType === 'PACKAGE' ? ('PACKAGE' as const) : ('INDIVIDUAL_TEST' as const),
      category: r.category,
      group: CARD_KEY_BY_CATEGORY.get((r.category ?? '').trim().toLowerCase()) ?? null,
      badgeText: r.badgeText?.trim() || null,
      ...pricing(r),
      /** the number of tests the package contains (as recorded for it) */
      totalTestsCount: Math.max(r.totalTestsCount ?? 1, 1),
      /** how many of them are listed by name */
      listedTestsCount: tests.length,
      testsPreview: tests.slice(0, 3),
      reportTime: r.reportTime?.trim() || null,
      sampleRequired: r.sampleRequired?.trim() || null,
      preparation: r.preparation?.trim() || null,
      targetGender: r.targetGender && r.targetGender !== 'ALL' ? r.targetGender : null,
      isPopular: r.isPopular,
    };
  }
}
