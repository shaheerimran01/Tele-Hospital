import {
  Body,
  Controller,
  Get,
  Param,
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
  getUserOrders(@Query('userId') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  @Get(':id')
  getOrderById(
    @Param('id') orderId: string,
    @Query('userId') userId: string,
  ) {
    return this.ordersService.getOrderById(orderId, userId);
  }
}