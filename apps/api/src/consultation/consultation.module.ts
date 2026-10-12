import { Module } from '@nestjs/common';

import { ConsultationController } from './consultation.controller.js';
import { ConsultationService } from './consultation.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
  exports: [ConsultationService],
})
export class ConsultationModule {}
