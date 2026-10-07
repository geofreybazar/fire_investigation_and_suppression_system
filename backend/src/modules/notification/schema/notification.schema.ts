import { z } from 'zod';

export const notificationSchema = z.object({
  investigationUpdates: z.boolean(),
  reportReview: z.boolean(),
  systemAnnouncements: z.boolean(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;
