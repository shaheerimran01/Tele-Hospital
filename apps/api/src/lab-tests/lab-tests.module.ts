import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LabTestsController } from './lab-tests.controller.js';
import { LabTestsService } from './lab-tests.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
