import axios from "axios";
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api",
  timeout: 15000,
});
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("oner-access-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
