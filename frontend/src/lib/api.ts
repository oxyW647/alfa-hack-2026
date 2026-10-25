import axios from "axios";

import { useAuth } from "@/lib/auth";

export const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAuth.getState().token) {
      useAuth.getState().setToken(null);
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  detail: string;
  field?: string | null;
}

export function errorText(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.detail) return data.field ? `${data.field}: ${data.detail}` : data.detail;
  }
  return "Что-то пошло не так";
}
