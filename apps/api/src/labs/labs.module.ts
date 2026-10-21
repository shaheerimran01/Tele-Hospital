import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LabsController } from './labs.controller.js';
import { LabsService } from './labs.service.js';
import { LabPricingController } from './lab-pricing.controller.js';
import { LabPricingService } from './lab-pricing.service.js';
import { LabAuthService } from './lab-auth.service.js';
import { LabPortalService } from './lab-portal.service.js';
import { LabAuthController, LabPortalController } from './lab-portal.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [LabsController, LabPricingController, LabAuthController, LabPortalController],
  providers: [LabsService, LabPricingService, LabAuthService, LabPortalService],
  exports: [LabsService, LabPricingService],
})
export class LabsModule {}
