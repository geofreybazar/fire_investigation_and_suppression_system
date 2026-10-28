import { z } from "zod";
import type { Pagination } from "../pagination";

export const notificationSchema = z.object({
  investigationUpdates: z.boolean(),
  reportReview: z.boolean(),
  systemAnnouncements: z.boolean(),
  incidentUpdates: z.boolean(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;

export interface NotificationSettings extends NotificationInput {
  id: string;
  userId: string;
}

export type UpdateNotifSettings = Omit<NotificationSettings, "id">;

// In-app notifications (REQUIREMENTS.md Q-21).
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: "FIRE_INCIDENT" | "INVESTIGATION";
  entityId: string;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  pagination: Pagination;
}
