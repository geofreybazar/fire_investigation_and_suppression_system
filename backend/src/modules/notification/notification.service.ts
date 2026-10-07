import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UUID } from 'crypto';

import { NotificationRepository } from './notification.repository.js';
import { NotificationInput } from './schema/notification.schema.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  private readonly logger = new Logger();

  async getUserNotificationSettings(userId: UUID) {
    const notification =
      await this.notificationRepository.getUserNotificationSettings(userId);

    if (!notification) {
      throw new NotFoundException('Notification Settings not found');
    }

    return notification;
  }

  async updateNotificationSettings(
    id: string,
    updateNotificationDato: NotificationInput,
  ) {
    this.logger.log('updating user notification settings');

    // update user notification settings
    await this.notificationRepository.updateNotificationSettings(
      id,
      updateNotificationDato,
    );

    this.logger.log('Update notification settings successful');

    return;
  }
}
