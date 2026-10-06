import { Module } from '@nestjs/common';
import { PharmacyProductsController } from './pharmacy-products.controller.js';
import { PharmacyProductsAdminController } from './pharmacy-products-admin.controller.js';
import { PharmacyProductsCatalogController } from './pharmacy-products-catalog.controller.js';
import { PharmacyProductsService } from './pharmacy-products.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    PharmacyProductsController,
    PharmacyProductsAdminController,
    PharmacyProductsCatalogController,
  ],
  providers: [PharmacyProductsService],
  exports: [PharmacyProductsService],
})
export class PharmacyProductsModule {}