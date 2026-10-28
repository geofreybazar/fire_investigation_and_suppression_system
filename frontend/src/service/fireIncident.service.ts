import { axiosJWT } from "./AxiosCreate";
import type {
  FireIncidentDetail,
  FireIncidentListFilters,
  PaginatedDeletedFireIncidents,
  PaginatedFireIncidents,
  SubmitIncidentPayload,
  TimelineEntryPayload,
  UpdateIncidentPayload,
} from "@/interface/fireIncident/fireIncident";

const BASE_URL = "/api/fire-incident";

const getFireIncidents = async (
  filters: FireIncidentListFilters,
): Promise<PaginatedFireIncidents> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/", {
    params: {
      page: filters.page,
      ...(filters.status && { status: filters.status }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus }),
      ...(filters.search && { search: filters.search }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    },
  });
  return response.data;
};

const getFireIncident = async (id: string): Promise<FireIncidentDetail> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get(`/${id}`);
  return response.data;
};

const submitFireIncident = async (
  data: SubmitIncidentPayload,
): Promise<{ id: string }> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post("/", data);
  return response.data;
};

const updateFireIncident = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateIncidentPayload;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.patch(`/${id}`, data);
  return response.data;
};

const approveFireIncident = async (
  id: string,
): Promise<{ incidentNo: string }> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/approve`);
  return response.data;
};

const rejectFireIncident = async ({
  id,
  remarks,
}: {
  id: string;
  remarks: string;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/reject`, { remarks });
  return response.data;
};

const resubmitFireIncident = async (id: string) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/resubmit`);
  return response.data;
};

// Staff remove their own rejected incidents; SUPER_ADMIN deletes with a
// reason and the memo reference.
const removeFireIncident = async ({
  id,
  reason,
  memoReference,
}: {
  id: string;
  reason?: string;
  memoReference?: string;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.delete(`/${id}`, {
    data: {
      ...(reason && { reason }),
      ...(memoReference && { memoReference }),
    },
  });
  return response.data;
};

const addTimelineEntry = async ({
  id,
  entry,
}: {
  id: string;
  entry: TimelineEntryPayload;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/timeline`, entry);
  return response.data;
};

const voidTimelineEntry = async ({
  id,
  entryId,
  reason,
}: {
  id: string;
  entryId: string;
  reason: string;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/timeline/${entryId}/void`, {
    reason,
  });
  return response.data;
};

const correctTimelineEntry = async ({
  id,
  entryId,
  reason,
  entry,
}: {
  id: string;
  entryId: string;
  reason: string;
  entry: TimelineEntryPayload;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/timeline/${entryId}/correct`, {
    reason,
    entry,
  });
  return response.data;
};

const getDeletedFireIncidents = async (
  page: number,
): Promise<PaginatedDeletedFireIncidents> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/deleted", { params: { page } });
  return response.data;
};

const restoreFireIncident = async (id: string) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/restore`);
  return response.data;
};

export default {
  getFireIncidents,
  getFireIncident,
  submitFireIncident,
  updateFireIncident,
  approveFireIncident,
  rejectFireIncident,
  resubmitFireIncident,
  removeFireIncident,
  addTimelineEntry,
  voidTimelineEntry,
  correctTimelineEntry,
  getDeletedFireIncidents,
  restoreFireIncident,
};
