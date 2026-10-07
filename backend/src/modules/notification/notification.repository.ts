import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { UUID } from 'crypto';
import { NotificationInput } from './schema/notification.schema.js';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserNotificationSettings(userId: UUID) {
    return this.prismaService.notificationPreference.findUnique({
      where: {
        userId,
      },
    });
  }

  async updateNotificationSettings(
    id: string,
    updateNotificationDato: NotificationInput,
  ) {
    return this.prismaService.notificationPreference.update({
      data: {
        investigationUpdates: updateNotificationDato.investigationUpdates,
        reportReview: updateNotificationDato.reportReview,
        systemAnnouncements: updateNotificationDato.systemAnnouncements,
      },
      where: {
        userId: id,
      },
    });
  }
}
