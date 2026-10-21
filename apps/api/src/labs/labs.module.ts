import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LabsController } from './labs.controller.js';
import { LabsService } from './labs.service.js';
import { LabPricingController } from './lab-pricing.controller.js';
import { LabPricingService } from './lab-pricing.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LabsController, LabPricingController],
  providers: [LabsService, LabPricingService],
  exports: [LabsService, LabPricingService],
})
export class LabsModule {}
