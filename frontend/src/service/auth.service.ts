import type { LoginType } from "@/interface/login";
import { axiosJWT } from "./AxiosCreate";

const login = async (credentials: LoginType) => {
  const apiClient = await axiosJWT("/auth");
  const response = await apiClient.post("/login", credentials);
  return response.data;
};

const logout = async () => {
  const apiClient = await axiosJWT("/auth");
  const response = await apiClient.post("/logout");
  return response.data;
};

export default { login, logout };
