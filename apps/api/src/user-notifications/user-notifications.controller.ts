import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { UserNotificationsService } from './user-notifications.service.js';

@Controller('user-notifications')
export class UserNotificationsController {
  constructor(private readonly userNotificationsService: UserNotificationsService) {}

  // GET /user-notifications?userId=xxxx
  @Get()
  async getUserNotifications(@Query('userId') userId: string) {
    return this.userNotificationsService.getUserNotifications(userId);
  }

  // PATCH /user-notifications/:id/read
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.userNotificationsService.markAsRead(id);
  }
}