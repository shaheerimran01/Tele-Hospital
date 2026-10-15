import { Module } from '@nestjs/common';

import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentResolutionService } from './appointment-resolution.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentResolutionService],
  exports: [AppointmentsService, AppointmentResolutionService],
})
export class AppointmentsModule {}
