import axios from "axios";
export let accessToken = "";
export const setToken = (v: string) => {
  accessToken = v;
};
const rawUrl = (import.meta.env.VITE_API_URL || "/api/v1").trim().replace(/\/+$/, "");
const baseURL = rawUrl.endsWith("/api/v1") ? rawUrl : `${rawUrl}/api/v1`;
const api = axios.create({
  baseURL,
  withCredentials: true,
});
api.interceptors.request.use((c) => {
  if (accessToken) c.headers.Authorization = `Bearer ${accessToken}`;
  return c;
});
export default api;
