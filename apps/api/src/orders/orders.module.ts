import { Module } from '@nestjs/common';
import { OrdersController, PharmacyDashboardOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import {
  AdminLabOrdersController,
  LabOrdersController,
  PartnerLabOrdersController,
} from './lab-orders.controller.js';
import { LabOrdersService } from './lab-orders.service.js';

@Module({
  controllers: [
    OrdersController,
    PharmacyDashboardOrdersController,
    LabOrdersController,
    AdminLabOrdersController,
    PartnerLabOrdersController,
  ],
  providers: [OrdersService, LabOrdersService],
  exports: [OrdersService, LabOrdersService],
})
export class OrdersModule {}
