import { Module } from '@nestjs/common';

import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}