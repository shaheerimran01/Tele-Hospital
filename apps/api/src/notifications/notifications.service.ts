import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllNotifications() {
    return this.prisma.notification.findMany({
      include: {
        order: {
          include: {
            user: true,
            items: true,
            prescriptions: true,
          },
        },
        pharmacy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUnreadNotifications() {
    return this.prisma.notification.findMany({
      where: {
        isRead: false,
      },
      include: {
        order: {
          include: {
            user: true,
            items: true,
            prescriptions: true,
          },
        },
        pharmacy: true, // 👈 Pharmacy relation attach kar di hai
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
      },
    });
  }

  // 👈 NEW: Notification DB mein save karne ka service method
  async createNotification(data: {
    type?: string;
    title?: string;
    message: string;
    pharmacyId?: string;
    orderId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        type: data.type || 'ADMIN_MESSAGE',
        title: data.title || 'Message from Admin',
        message: data.message,
        pharmacyId: data.pharmacyId || null,
        orderId: data.orderId || null,
      },
    });
  }
}