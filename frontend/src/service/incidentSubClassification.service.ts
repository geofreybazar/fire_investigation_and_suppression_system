import { axiosJWT } from "./AxiosCreate";
import type { FireIncidentSubCategoriesInput } from "@/interface/incidentSubClassification/incidentSubClassification";

const addFireIncidentSubClassification = async (
  data: FireIncidentSubCategoriesInput,
) => {
  const apiClient = await axiosJWT("/fire_incident_subcategories_api");
  const response = await apiClient.post("/", data);
  return response.data;
};

export default {
  addFireIncidentSubClassification,
};
