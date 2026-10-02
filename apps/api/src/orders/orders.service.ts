import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        cart: { userId },
      },
      include: { product: true },
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
              product: { connect: { id: item.productId } },
              productName: item.product.name,
              quantity: item.quantity,
              price,
              total: price * item.quantity,
              isAvailable: true,
            };
          }),
        },
      },
      include: {
        items: true,
        prescriptions: true,
      },
    });

    await this.prisma.prescription.updateMany({
      where: { userId, orderId: null },
      data: { orderId: order.id },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let userName = 'Customer';
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      userName = fullName || user.phone || user.email || 'Customer';
    }

    await this.prisma.notification.create({
      data: {
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `New order TB-${order.id.slice(0, 8).toUpperCase()} of Rs. ${totalAmount} has been placed by ${userName}.`,
        orderId: order.id,
      },
    });

    await this.prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    return order;
  }

  async getUserOrders(userId?: string) {
    if (!userId) return [];
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  // 1. Order Status Update + Send UserNotification
  async updateOrderStatus(orderId: string, status: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: status.toUpperCase() },
      include: {
        user: true,
        items: true,
        prescriptions: true,
      },
    });

    const orderCode = `TB-${existingOrder.id.slice(0, 8).toUpperCase()}`;
    const statusMessages: Record<string, string> = {
      REVIEWING: `Your Order ${orderCode} is under review.`,
      CONFIRMED: `Your Order ${orderCode} has been confirmed.`,
      PROCESSING: `Your Order ${orderCode} is being processed.`,
      COMPLETED: `Your Order ${orderCode} has been completed successfully!`,
      CANCELLED: `Your Order ${orderCode} has been cancelled.`,
      PENDING: `Your Order ${orderCode} is pending.`,
    };

    const statusUpper = status.toUpperCase();
    await this.prisma.userNotification.create({
      data: {
        userId: existingOrder.userId,
        orderId: existingOrder.id,
        title: `Order Status: ${statusUpper}`,
        message: statusMessages[statusUpper] || `Your Order ${orderCode} status has been updated to ${statusUpper}.`,
        type: 'ORDER_STATUS_UPDATE',
      },
    });

    return updatedOrder;
  }

  // 2. Item Availability Update + Send UserNotification (if unavailable)
  async updateOrderItemAvailability(orderId: string, itemId: string, isAvailable: boolean) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: { order: true },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item nahi mila');
    }

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    if (!isAvailable) {
      const orderCode = `TB-${orderItem.orderId.slice(0, 8).toUpperCase()}`;
      await this.prisma.userNotification.create({
        data: {
          userId: orderItem.order.userId,
          orderId: orderItem.orderId,
          title: 'Item Unavailable in Order',
          message: `Your Order ${orderCode} has an unavailable item "${orderItem.productName}".`,
          type: 'PRODUCT_UNAVAILABLE',
        },
      });
    }

    return updatedItem;
  }
}