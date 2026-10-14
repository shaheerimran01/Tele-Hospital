import { Module } from '@nestjs/common';

import { DoctorDashboardController } from './doctor-dashboard.controller.js';
import { DoctorDashboardService } from './doctor-dashboard.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';

@Module({
  imports: [PrismaModule, DoctorsModule, AppointmentsModule],
  controllers: [DoctorDashboardController],
  providers: [DoctorDashboardService],
})
export class DoctorDashboardModule {}
