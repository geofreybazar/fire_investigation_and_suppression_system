import { z } from "zod";
import type { Pagination } from "../pagination";

export const notificationSchema = z.object({
  casualtyAlerts: z.boolean(),
  recordCorrections: z.boolean(),
  systemAnnouncements: z.boolean(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;

export interface NotificationSettings extends NotificationInput {
  id: string;
  userId: string;
}

export type UpdateNotifSettings = Omit<NotificationSettings, "id">;

// In-app notifications (REQUIREMENTS.md §9.2).
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: "INCIDENT" | "CASUALTY";
  entityId: string;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  pagination: Pagination;
}
