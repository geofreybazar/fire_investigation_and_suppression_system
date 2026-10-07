import { axiosJWT } from "./AxiosCreate";
import type {
  NotificationSettings,
  UpdateNotifSettings,
} from "@/interface/notifications/notifications";

const getUserNotificationSettings = async (
  userId: string,
): Promise<NotificationSettings> => {
  const apiClient = await axiosJWT("/notification");
  const response = await apiClient.get(`/${userId}`);
  return response.data;
};

const updateNotificationSettings = async (
  data: UpdateNotifSettings,
): Promise<NotificationSettings> => {
  const apiClient = await axiosJWT("/notification");
  const response = await apiClient.patch(`/${data.userId}`, data);
  return response.data;
};

export default { getUserNotificationSettings, updateNotificationSettings };
