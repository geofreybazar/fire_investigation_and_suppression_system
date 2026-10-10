import { axiosJWT } from "./AxiosCreate";
import type {
  AssignedItem,
  InvestigationCase,
  InvestigationDetail,
  InvestigationDraftPayload,
  InvestigatorCandidate,
  Paginated,
  QueueItem,
  ReviewDecision,
} from "@/interface/investigation/investigation";

const BASE_URL = "/api/investigation";

const getInvestigationCase = async (
  incidentId: string,
): Promise<InvestigationCase> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get(`/incident/${incidentId}`);
  return response.data;
};

const getInvestigationCandidates = async (
  incidentId: string,
): Promise<InvestigatorCandidate[]> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get(`/incident/${incidentId}/candidates`);
  return response.data;
};

const referCase = async ({
  incidentId,
  toOfficeId,
  remarks,
}: {
  incidentId: string;
  toOfficeId: string;
  remarks?: string;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/incident/${incidentId}/refer`, {
    toOfficeId,
    ...(remarks && { remarks }),
  });
  return response.data;
};

const startInvestigation = async ({
  incidentId,
  investigatorId,
}: {
  incidentId: string;
  investigatorId: string;
}): Promise<{ id: string; investigationNo: string }> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/incident/${incidentId}/start`, {
    investigatorId,
  });
  return response.data;
};

const getInvestigation = async (id: string): Promise<InvestigationDetail> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get(`/${id}`);
  return response.data;
};

const updateInvestigation = async ({
  id,
  data,
}: {
  id: string;
  data: InvestigationDraftPayload;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.patch(`/${id}`, data);
  return response.data;
};

const submitReport = async (id: string) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/submit`);
  return response.data;
};

const reviewReport = async ({
  id,
  decision,
  remarks,
}: {
  id: string;
  decision: ReviewDecision;
  remarks?: string;
}) => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.post(`/${id}/review`, {
    decision,
    ...(remarks && { remarks }),
  });
  return response.data;
};

const getInvestigationQueue = async (
  page: number,
): Promise<Paginated<QueueItem>> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/queue", { params: { page } });
  return response.data;
};

const getAssignedInvestigations = async (
  page: number,
): Promise<Paginated<AssignedItem>> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/assigned", { params: { page } });
  return response.data;
};

export default {
  getInvestigationCase,
  getInvestigationCandidates,
  referCase,
  startInvestigation,
  getInvestigation,
  updateInvestigation,
  submitReport,
  reviewReport,
  getInvestigationQueue,
  getAssignedInvestigations,
};
