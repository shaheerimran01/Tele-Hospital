import { Module } from '@nestjs/common';

import { DoctorAdminController } from './doctor-admin.controller.js';
import { DoctorAdminService } from './doctor-admin.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';

@Module({
  imports: [PrismaModule, DoctorsModule],
  controllers: [DoctorAdminController],
  providers: [DoctorAdminService],
})
export class DoctorAdminModule {}
