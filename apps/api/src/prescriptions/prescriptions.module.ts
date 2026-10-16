import { Module } from '@nestjs/common';

import { PrescriptionsController } from './prescriptions.controller.js';
import { PrescriptionsService } from './prescriptions.service.js';
import { ConsultationPrescriptionsController } from './consultation-prescriptions.controller.js';
import { ConsultationPrescriptionsService } from './consultation-prescriptions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';

@Module({
  imports: [PrismaModule, DoctorsModule],
  controllers: [PrescriptionsController, ConsultationPrescriptionsController],
  providers: [PrescriptionsService, ConsultationPrescriptionsService],
})
export class PrescriptionsModule {}
