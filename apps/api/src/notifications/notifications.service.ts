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
        order: true,
        prescriptions: true,
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
}