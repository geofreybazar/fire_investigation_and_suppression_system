import { axiosJWT } from "./AxiosCreate";
import type {
  MapPoint,
  PaginatedIncidentReport,
  StatisticsFilters,
  StatisticsSummary,
} from "@/interface/statistics/statistics";

const BASE_URL = "/api/statistics";

const params = (filters: StatisticsFilters) => ({
  ...(filters.from && { from: filters.from }),
  ...(filters.to && { to: filters.to }),
  ...(filters.status && { status: filters.status }),
  ...(filters.categoryType && { categoryType: filters.categoryType }),
});

const getSummary = async (
  filters: StatisticsFilters,
): Promise<StatisticsSummary> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/summary", { params: params(filters) });
  return response.data;
};

const getIncidentReport = async (
  filters: StatisticsFilters,
  page: number,
): Promise<PaginatedIncidentReport> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/incidents", {
    params: { ...params(filters), page },
  });
  return response.data;
};

// The CSV comes through the authenticated client (cookie refresh included),
// then is saved by the browser.
const downloadIncidentReport = async (
  filters: StatisticsFilters,
): Promise<{ truncated: boolean }> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/incidents.csv", {
    params: params(filters),
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fire-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return { truncated: response.headers["x-report-truncated"] === "true" };
};

const getMapPoints = async (
  filters: StatisticsFilters,
): Promise<MapPoint[]> => {
  const apiClient = await axiosJWT(BASE_URL);
  const response = await apiClient.get("/map", { params: params(filters) });
  return response.data;
};

export default {
  getSummary,
  getIncidentReport,
  downloadIncidentReport,
  getMapPoints,
};
