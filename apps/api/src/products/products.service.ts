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

  // Create product
  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        slug: createProductDto.slug,

        genericName: createProductDto.genericName,
        brandName: createProductDto.brandName,

        description: createProductDto.description,

        category: createProductDto.category,
        subCategory: createProductDto.subCategory,

        dosageForm: createProductDto.dosageForm,
        strength: createProductDto.strength,
        packSize: createProductDto.packSize,

        manufacturer: createProductDto.manufacturer,

        prescriptionRequired:
          createProductDto.prescriptionRequired ?? false,

        imageUrl: createProductDto.imageUrl,
      },
    });
  }

  // Get all products
  async findAll() {
    return this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get single product
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