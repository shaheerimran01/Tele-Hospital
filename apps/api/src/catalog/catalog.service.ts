import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCatalogItemDto, ListCatalogItemsQueryDto, UpdateCatalogItemDto } from './dto/catalog.dto.js';

const ITEM_SELECT = {
  id: true,
  title: true,
  slug: true,
  code: true,
  itemType: true,
  category: true,
  basePrice: true,
  discountPrice: true,
  totalTestsCount: true,
  testsIncluded: true,
  reportTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LabPackageSelect;

function slugFor(title: string) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
  return `${base || 'catalog-item'}-${randomUUID().slice(0, 8)}`;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCatalogItemsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();
    const where: Prisma.LabPackageWhereInput = {
      ...(query.itemType ? { itemType: query.itemType } : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items, categoryRows] = await Promise.all([
      this.prisma.labPackage.count({ where }),
      this.prisma.labPackage.findMany({
        where,
        select: ITEM_SELECT,
        orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.labPackage.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      categories: categoryRows.map((row) => row.category).filter((category): category is string => Boolean(category)),
    };
  }

  create(dto: CreateCatalogItemDto) {
    const testsIncluded = dto.testsIncluded ?? [];
    return this.prisma.labPackage.create({
      data: {
        title: dto.title,
        slug: slugFor(dto.title),
        code: dto.code ?? null,
        itemType: dto.itemType,
        category: dto.category ?? null,
        basePrice: dto.basePrice,
        discountPrice: dto.discountPrice ?? null,
        totalTestsCount: Math.max(testsIncluded.length, 1),
        testsIncluded,
        reportTime: dto.reportTime ?? null,
        isActive: dto.isActive ?? true,
      },
      select: ITEM_SELECT,
    });
  }

  async update(id: string, dto: UpdateCatalogItemDto) {
    await this.find(id);
    const { testsIncluded, ...rest } = dto;
    return this.prisma.labPackage.update({
      where: { id },
      data: {
        ...rest,
        ...(testsIncluded !== undefined
          ? { testsIncluded, totalTestsCount: Math.max(testsIncluded.length, 1) }
          : {}),
      },
      select: ITEM_SELECT,
    });
  }

  /** Soft deletion keeps historical lab price records intact while hiding the catalog entry. */
  async remove(id: string) {
    await this.find(id);
    return this.prisma.labPackage.update({ where: { id }, data: { isActive: false }, select: ITEM_SELECT });
  }

  private async find(id: string) {
    const item = await this.prisma.labPackage.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('Catalog item not found.');
    return item;
  }
}
