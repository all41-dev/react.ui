import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "../config/env";
import { ApiError, ApiAuthError } from "./errors";

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_PATH,
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError | ApiError) => {
    if (error instanceof ApiError) {
      return Promise.reject(error);
    }

    if ((error as AxiosError).isAxiosError) {
      const ax = error as AxiosError;
      const status = ax.response?.status;
      const payload = ax.response?.data;
      const baseMsg =
        (payload as any)?.message ||
        ax.message ||
        (status ? `Request failed (${status})` : "Network error");

      if (status === 401) {
        return Promise.reject(
          new ApiAuthError(baseMsg, { status, payload, cause: ax })
        );
      }

      return Promise.reject(
        new ApiError(baseMsg, { status, payload, cause: ax })
      );
    }

    return Promise.reject(
      new ApiError((error as any)?.message ?? "Unexpected error", {
        cause: error,
      })
    );
  }
);

export const isCancel = axios.isCancel;
