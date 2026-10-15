import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { ConsultationsController } from './consultations.controller.js';
import { ConsultationsGateway } from './consultations.gateway.js';
import { ConsultationsService } from './consultations.service.js';

/** Online consultation rooms: access checks, chat history, real-time gateway (Socket.io). */
@Module({
  imports: [PrismaModule, DoctorsModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway],
})
export class ConsultationsModule {}
