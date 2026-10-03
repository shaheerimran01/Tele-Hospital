import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class PharmacyProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to convert product name to clean URL slug
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Helper to dynamically extract value based on common CSV header aliases
  private getCsvValue(row: Record<string, any>, aliases: string[]): string | null {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const matchKey = keys.find(
        (key) => key.trim().toLowerCase() === alias.toLowerCase()
      );
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
        const val = String(row[matchKey]).trim();
        if (val !== '') return val;
      }
    }
    return null;
  }

  // Main Method: Parse CSV Buffer & Save into Product + PharmacyProduct tables
  async processProductsCsv(pharmacyId: string, fileBuffer: Buffer) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Valid CSV file is required.');
    }

    // Verify Pharmacy exists
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with ID ${pharmacyId} not found.`);
    }

    const rows: Record<string, any>[] = [];
    const stream = Readable.from(fileBuffer);

    // Step 1: Parse CSV Stream
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', (err) => reject(new BadRequestException(`CSV Parsing Error: ${err.message}`)));
    });

    if (rows.length === 0) {
      throw new BadRequestException('Uploaded CSV file is empty.');
    }

    let importedCount = 0;
    let newMasterProductsCreated = 0;
    let skippedRowsCount = 0;

    // Step 2: Sequential Processing
    for (const row of rows) {
      // Header Alias Resolver
      const rawName = this.getCsvValue(row, [
        'product name', 'product_name', 'name', 'title', 'medicine name', 'item name'
      ]);

      const rawPrice = this.getCsvValue(row, [
        'price', 'unit price', 'mrp', 'rate', 'selling price', 'cost'
      ]);

      const rawStock = this.getCsvValue(row, [
        'stock', 'quantity', 'qty', 'stock quantity', 'available stock'
      ]);

      const rawBrand = this.getCsvValue(row, [
        'brand', 'brand name', 'manufacturer', 'company', 'marketer'
      ]);

      const rawGeneric = this.getCsvValue(row, [
        'generic name', 'generic', 'salt', 'composition', 'formula'
      ]);

      const rawSku = this.getCsvValue(row, [
        'sku', 'barcode', 'item code', 'product code', 'id'
      ]);

      // Skip row if minimum required fields (Name or Price) are missing
      if (!rawName || !rawPrice) {
        skippedRowsCount++;
        continue;
      }

      const productName = rawName.trim();
      const priceNum = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
      const stockNum = rawStock ? parseInt(rawStock.replace(/\D/g, ''), 10) : 10;

      if (isNaN(priceNum)) {
        skippedRowsCount++;
        continue;
      }

      const slug = this.slugify(productName);

      // Step 3: Master Product Lookup or Insertion
      let product = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            name: productName,
            slug,
            brandName: rawBrand || null,
            genericName: rawGeneric || null,
            price: priceNum,
            originalPrice: priceNum,
            isActive: true,
          },
        });
        newMasterProductsCreated++;
      }

      // Step 4: Upsert into PharmacyProduct Table
      await this.prisma.pharmacyProduct.upsert({
        where: {
          productId_pharmacyId: {
            productId: product.id,
            pharmacyId: pharmacyId,
          },
        },
        update: {
          price: priceNum,
          mrp: priceNum,
          stock: isNaN(stockNum) ? 0 : stockNum,
          sku: rawSku || undefined,
          isAvailable: (isNaN(stockNum) ? 0 : stockNum) > 0,
        },
        create: {
          pharmacyId: pharmacyId,
          productId: product.id,
          price: priceNum,
          mrp: priceNum,
          stock: isNaN(stockNum) ? 0 : stockNum,
          sku: rawSku || null,
          isAvailable: (isNaN(stockNum) ? 0 : stockNum) > 0,
          metadata: row, // Dynamic raw CSV row JSON preserve
        },
      });

      importedCount++;
    }

    return {
      success: true,
      message: `${importedCount} products imported successfully for ${pharmacy.name}.`,
      stats: {
        totalRowsInCsv: rows.length,
        importedCount,
        newMasterProductsCreated,
        skippedRowsCount,
      },
    };
  }
}