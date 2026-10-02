import { Module } from '@nestjs/common';
import { PharmaciesService } from './pharmacies.service.js';
import { PharmaciesController } from './pharmacies.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PharmaciesController],
  providers: [PharmaciesService],
  exports: [PharmaciesService],
})
export class PharmaciesModule {}