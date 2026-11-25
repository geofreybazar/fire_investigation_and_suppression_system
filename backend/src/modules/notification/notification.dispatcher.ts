import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationEntityType,
  NotificationType,
  UserRole,
} from '../../generated/prisma/enums.js';
import { NotificationRepository } from './notification.repository.js';

// The preference that lets a user opt out of each notification type
// (REQUIREMENTS.md §9.2).
export type NotificationPreferenceKey = 'casualtyAlerts' | 'recordCorrections';

export const PREFERENCE_FOR: Record<
  NotificationType,
  NotificationPreferenceKey
> = {
  BFP_PERSONNEL_CASUALTY: 'casualtyAlerts',
  CASUALTY_DECEASED: 'casualtyAlerts',
  RECORD_CORRECTED: 'recordCorrections',
};

// Either specific users, or the active holders of some roles in some offices.
export type NotificationRecipients =
  | { userIds: string[] }
  | { officeIds: string[]; roles: UserRole[] };

export interface NotificationEvent {
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType;
  entityId: string;
  // The user who caused the event never notifies themselves.
  actorId: string;
  recipients: NotificationRecipients;
}

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  // Called after the business change has committed. Best effort: a failure is
  // logged and never undoes or fails the change that caused it.
  async notify(event: NotificationEvent): Promise<void> {
    try {
      const userIds = await this.notificationRepository.findRecipientIds(
        event.recipients,
        PREFERENCE_FOR[event.type],
      );
      const recipients = userIds.filter((id) => id !== event.actorId);

      if (recipients.length === 0) {
        return;
      }

      await this.notificationRepository.createNotifications(
        recipients.map((userId) => ({
          userId,
          type: event.type,
          title: event.title,
          body: event.body,
          entityType: event.entityType,
          entityId: event.entityId,
        })),
      );
    } catch (error) {
      this.logger.error(
        `Could not send ${event.type} notification`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
