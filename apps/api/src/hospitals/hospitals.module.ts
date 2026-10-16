import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HospitalsController } from './hospitals.controller.js';
import { HospitalsService } from './hospitals.service.js';
import { AdminHospitalsController } from '../admin/hospitals/admin-hospitals.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [HospitalsController, AdminHospitalsController],
  providers: [HospitalsService],
})
export class HospitalsModule {}
