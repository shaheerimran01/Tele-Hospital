import {
  Controller,
  Get,
  Param,
  Patch,
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
}