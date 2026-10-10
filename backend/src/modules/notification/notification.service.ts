import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UUID } from 'crypto';

import { NotificationRepository } from './notification.repository.js';
import { NotificationInput } from './schema/notification.schema.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  private readonly logger = new Logger();

  async getUserNotificationSettings(
    userId: UUID,
    currentUser: CurrentUserJwtPayload,
  ) {
    this.assertOwnSettings(userId, currentUser);

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
    currentUser: CurrentUserJwtPayload,
  ) {
    this.assertOwnSettings(id, currentUser);

    this.logger.log('updating user notification settings');

    // update user notification settings
    await this.notificationRepository.updateNotificationSettings(
      id,
      updateNotificationDato,
    );

    this.logger.log('Update notification settings successful');

    return;
  }

  // Users may only read or change their own notification preferences.
  private assertOwnSettings(
    userId: string,
    currentUser: CurrentUserJwtPayload,
  ) {
    if (userId !== currentUser.sub) {
      throw new ForbiddenException(
        'You can only access your own notification settings.',
      );
    }
  }
}
