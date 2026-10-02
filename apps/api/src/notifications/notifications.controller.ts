import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  getAllNotifications() {
    return this.notificationsService.getAllNotifications();
  }

  @Get('unread')
  getUnreadNotifications() {
    return this.notificationsService.getUnreadNotifications();
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  // 👈 NEW: Admin notification/message send karne ka endpoint
  @Post()
  createNotification(
    @Body() body: { type?: string; title?: string; message: string; pharmacyId?: string; orderId?: string },
  ) {
    return this.notificationsService.createNotification(body);
  }
}