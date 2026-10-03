import { Module } from '@nestjs/common';
import { PharmacyProductsController } from './pharmacy-products.controller.js';
import { PharmacyProductsService } from './pharmacy-products.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PharmacyProductsController],
  providers: [PharmacyProductsService],
  exports: [PharmacyProductsService],
})
export class PharmacyProductsModule {}