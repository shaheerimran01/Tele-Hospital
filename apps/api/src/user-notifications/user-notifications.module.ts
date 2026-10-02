import { Module } from '@nestjs/common';
import { UserNotificationsController } from './user-notifications.controller.js';
import { UserNotificationsService } from './user-notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [UserNotificationsController],
  providers: [UserNotificationsService, PrismaService],
  exports: [UserNotificationsService],
})
export class UserNotificationsModule {}