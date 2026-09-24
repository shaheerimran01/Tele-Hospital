import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart/:userId
  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  // POST /cart/:userId/items
  @Post(':userId/items')
  async addToCart(
    @Param('userId') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, dto);
  }

  // PATCH /cart/:userId/items/:itemId
  @Patch(':userId/items/:itemId')
  async updateCartItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, itemId, dto);
  }

  // DELETE /cart/:userId/items/:itemId
  @Delete(':userId/items/:itemId')
  async removeCartItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeCartItem(userId, itemId);
  }

  // DELETE /cart/:userId
  @Delete(':userId')
  async clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}