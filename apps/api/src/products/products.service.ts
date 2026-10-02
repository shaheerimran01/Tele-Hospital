import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create product (Updated to include all form & schema fields)
  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        slug: createProductDto.slug,

        genericName: createProductDto.genericName,
        brandName: createProductDto.brandName,

        price: createProductDto.price,
        originalPrice: createProductDto.originalPrice,

        description: createProductDto.description,
        uses: createProductDto.uses,
        benefits: createProductDto.benefits,
        sideEffects: createProductDto.sideEffects,
        howToUse: createProductDto.howToUse,
        working: createProductDto.working,
        safetyAdvice: createProductDto.safetyAdvice,
        quickTips: createProductDto.quickTips,
        storage: createProductDto.storage,

        category: createProductDto.category,
        subCategory: createProductDto.subCategory,
        systemOfMedicine: createProductDto.systemOfMedicine ?? 'Allopathy',

        healthConditions: createProductDto.healthConditions ?? [],
        ingredients: createProductDto.ingredients ?? [],
        tags: createProductDto.tags ?? [],

        isFeatured: createProductDto.isFeatured ?? false,

        dosageForm: createProductDto.dosageForm,
        strength: createProductDto.strength,
        packSize: createProductDto.packSize,

        manufacturer: createProductDto.manufacturer,

        prescriptionRequired:
          createProductDto.prescriptionRequired ?? false,

        imageUrl: createProductDto.imageUrl,
        isActive: createProductDto.isActive ?? true,
      },
    });
  }

  // Get all products (UNTOUCHED - EXACTLY SAME)
  async findAll() {
    return this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Search products & generic formulas (UNTOUCHED - EXACTLY SAME)
  async searchProducts(query: string) {
    if (!query || query.trim().length < 2) {
      return { products: [], formulas: [] };
    }

    const cleanQuery = query.trim();
    const words = cleanQuery.split(/\s+/).filter((w) => w.length > 0);

    // 1. Fetch matching distinct generic formulas/salts from DB
    const formulasRaw = await this.prisma.product.findMany({
      where: {
        genericName: {
          contains: cleanQuery,
          mode: 'insensitive',
        },
      },
      select: {
        genericName: true,
      },
      distinct: ['genericName'],
      take: 5,
    });

    const formulas = formulasRaw
      .map((f) => f.genericName)
      .filter((g): g is string => !!g);

    // 2. Fetch matching products (matching name, genericName, or brandName)
    const products = await this.prisma.product.findMany({
      where: {
        AND: words.map((word) => ({
          OR: [
            { name: { contains: word, mode: 'insensitive' } },
            { genericName: { contains: word, mode: 'insensitive' } },
            { brandName: { contains: word, mode: 'insensitive' } },
          ],
        })),
      },
      take: 10,
    });

    // 3. Relevance Sorting (Starts-with matches prioritized)
    const lowerQuery = cleanQuery.toLowerCase();
    products.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    return { products, formulas };
  }

  // Get single product (UNTOUCHED - EXACTLY SAME)
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // Update product
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: {
        id,
      },
      data: updateProductDto,
    });
  }

  // Delete product
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: {
        id,
      },
    });
  }
}