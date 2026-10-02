import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UserNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // User ke saare notifications fetch karein
  async getUserNotifications(userId: string) {
    if (!userId) return [];

    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Single notification ko READ mark karne ke liye (Optional)
  async markAsRead(id: string) {
    const notification = await this.prisma.userNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification nahi mila');
    }

    return this.prisma.userNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}