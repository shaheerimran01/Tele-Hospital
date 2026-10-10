import { Module } from '@nestjs/common';
import { OrdersController, PharmacyDashboardOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  controllers: [OrdersController, PharmacyDashboardOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}