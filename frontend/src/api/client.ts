import axios from "axios";
export let accessToken = "";
export const setToken = (v: string) => {
  accessToken = v;
};
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
});
api.interceptors.request.use((c) => {
  if (accessToken) c.headers.Authorization = `Bearer ${accessToken}`;
  return c;
});
export default api;
