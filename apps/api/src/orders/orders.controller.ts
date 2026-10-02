import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

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
}