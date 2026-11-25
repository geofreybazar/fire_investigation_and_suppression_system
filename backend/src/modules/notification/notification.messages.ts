import {
  NotificationEntityType,
  NotificationType,
} from '../../generated/prisma/enums.js';

// Wording of each notification (REQUIREMENTS.md §9.2). Messages carry
// record numbers only, never casualty names or health details (FR-PII-006).

interface Message {
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType;
  entityId: string;
}

export const notificationMessages = {
  bfpPersonnelCasualty: (casualtyId: string, casualtyNo: string): Message => ({
    type: 'BFP_PERSONNEL_CASUALTY',
    title: 'BFP personnel casualty',
    body: `A BFP personnel casualty was recorded (${casualtyNo}).`,
    entityType: 'CASUALTY',
    entityId: casualtyId,
  }),

  casualtyDeceased: (casualtyId: string, casualtyNo: string): Message => ({
    type: 'CASUALTY_DECEASED',
    title: 'Fatality recorded',
    body: `A fatality was recorded (${casualtyNo}).`,
    entityType: 'CASUALTY',
    entityId: casualtyId,
  }),

  recordCorrected: (
    entityType: NotificationEntityType,
    entityId: string,
    recordNo: string,
  ): Message => ({
    type: 'RECORD_CORRECTED',
    title: 'Your record was corrected',
    body: `A record you created was corrected by another user (${recordNo}).`,
    entityType,
    entityId,
  }),
};
