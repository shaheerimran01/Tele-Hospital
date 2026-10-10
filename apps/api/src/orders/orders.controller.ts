import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Headers,
} from '@nestjs/common';

import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

interface PartialAllocationInput {
  orderItemId: string;
  pharmacyId: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(
    @Query('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get()
  async getOrders(@Query('userId') userId?: string) {
    if (userId) {
      return this.ordersService.getUserOrders(userId);
    }
    return this.ordersService.findAll();
  }

  @Get('pharmacy-orders/analytics')
  getPharmacyOrderRequestAnalytics(@Headers('x-pharmacy-id') pharmacyId: string) {
    return this.ordersService.getPharmacyOrderRequestAnalytics(pharmacyId);
  }

  @Get('pharmacy-orders')
  getPharmacyOrderRequests(@Headers('x-pharmacy-id') pharmacyId: string) {
    return this.ordersService.getPharmacyOrderRequests(pharmacyId);
  }

  @Get('pharmacy-orders/:id')
  getPharmacyOrderRequestById(
    @Param('id') id: string,
    @Headers('x-pharmacy-id') pharmacyId?: string,
  ) {
    return this.ordersService.getPharmacyOrderRequestById(id, pharmacyId);
  }

  @Patch('pharmacy-orders/:id/respond')
  respondToPharmacyOrderRequest(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('selectedOrderItemIds') selectedOrderItemIds?: string[],
    @Headers('x-pharmacy-id') pharmacyId?: string,
  ) {
    return this.ordersService.respondToPharmacyOrderRequest(id, status, pharmacyId, selectedOrderItemIds);
  }

  @Patch('pharmacy-orders/:id/respond-partial')
  respondToPharmacyOrderRequestPartial(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('selectedOrderItemIds') selectedOrderItemIds: string[],
    @Headers('x-pharmacy-id') pharmacyId?: string,
  ) {
    return this.ordersService.respondToPharmacyOrderRequestPartial(id, status, selectedOrderItemIds, pharmacyId);
  }

  @Get(':id/partial-summary')
  getPartialSummary(@Param('id') orderId: string) {
    return this.ordersService.getPartialSummary(orderId);
  }

  @Post(':id/confirm-split-assignment')
  confirmSplitAssignment(
    @Param('id') orderId: string,
    @Body('allocations') allocations: PartialAllocationInput[],
  ) {
    return this.ordersService.confirmSplitAssignment(orderId, allocations);
  }

  @Get(':id')
  getOrderById(
    @Param('id') orderId: string,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.getOrderById(orderId, userId);
  }

  @Patch(':id/status')
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateOrderStatus(orderId, status);
  }

  @Patch(':id/items/:itemId/availability')
  updateItemAvailability(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.ordersService.updateOrderItemAvailability(orderId, itemId, isAvailable);
  }

  @Get(':id/matching-pharmacies')
  getMatchingPharmacies(@Param('id') orderId: string) {
    return this.ordersService.getMatchingPharmacies(orderId);
  }

  @Get(':id/nearby-pharmacies')
  getNearbyPharmacies(
    @Param('id') orderId: string,
    @Query('radius') radius?: string,
  ) {
    const radiusKm = radius ? parseFloat(radius) : 20;
    return this.ordersService.getNearbyPharmacies(orderId, radiusKm);
  }

  @Post(':id/send-to-pharmacies')
  sendPharmacyOrderRequest(
    @Param('id') orderId: string,
    @Body('pharmacyIds') pharmacyIds: string[],
  ) {
    return this.ordersService.sendPharmacyOrderRequest(orderId, pharmacyIds);
  }
}

@Controller('pharmacy-dashboard/orders')
export class PharmacyDashboardOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('selectedOrderItemIds') selectedOrderItemIds?: string[],
    @Headers('x-pharmacy-id') pharmacyId?: string,
  ) {
    return this.ordersService.respondToPharmacyOrderRequest(id, status, pharmacyId, selectedOrderItemIds);
  }
}

