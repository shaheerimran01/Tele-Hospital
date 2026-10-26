import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LabPrescriptionsController } from './lab-prescriptions.controller.js';
import { LabPrescriptionsService } from './lab-prescriptions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LabPrescriptionsController],
  providers: [LabPrescriptionsService],
  exports: [LabPrescriptionsService],
})
export class LabPrescriptionsModule {}
