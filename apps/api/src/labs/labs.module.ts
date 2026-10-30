import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LabsController } from './labs.controller.js';
import { LabsService } from './labs.service.js';
import { LabPricingController } from './lab-pricing.controller.js';
import { LabPricingService } from './lab-pricing.service.js';
import { LabAuthService } from './lab-auth.service.js';
import { LabPortalService } from './lab-portal.service.js';
import { LabAuthController, LabPortalController } from './lab-portal.controller.js';
import { PatientLabsController } from './patient-labs.controller.js';
import { PatientLabsService } from './patient-labs.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LabsController, LabPricingController, LabAuthController, LabPortalController, PatientLabsController],
  providers: [LabsService, LabPricingService, LabAuthService, LabPortalService, PatientLabsService],
  exports: [LabsService, LabPricingService, LabAuthService],
})
export class LabsModule {}
