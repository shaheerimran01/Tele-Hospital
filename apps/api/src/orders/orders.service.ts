import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        cart: {
          userId,
        },
      },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const totalAmount = cartItems.reduce(
      (total, item) => total + (item.product.price ?? 0) * item.quantity,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod || 'COD',
        paymentStatus: 'PENDING',
        status: 'PENDING',

        items: {
          create: cartItems.map((item) => {
            const price = item.product.price ?? 0;

            return {
              product: {
                connect: {
                  id: item.productId,
                },
              },
              productName: item.product.name,
              quantity: item.quantity,
              price,
              total: price * item.quantity,
            };
          }),
        },
      },

      include: {
        items: true,
      },
    });

    await this.prisma.notification.create({
      data: {
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `New order ${order.id} has been placed by user ${userId}.`,
        orderId: order.id,
      },
    });

    await this.prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId,
        },
      },
    });

    return order;
  }

  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        userId,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return order;
  }
}