import { Module } from '@nestjs/common';

import { DoctorsController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
