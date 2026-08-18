import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "../config/env";
import { ApiError, ApiAuthError, getApiMessage } from "./errors";

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_PATH,
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError | ApiError) => {
    if (error instanceof ApiError) {
      return Promise.reject(error);
    }

    /*
     * Cancellations must pass through untouched. Wrapping one in ApiError makes the
     * exported `isCancel` return false for it, and a deliberately aborted request then
     * surfaces to callers as a real failure — and as an error toast.
     */
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if ((error as AxiosError).isAxiosError) {
      const ax = error as AxiosError;
      const status = ax.response?.status;
      const payload = ax.response?.data;
      // Walks response.data.message → message → the fallback, same as the UI helpers.
      const baseMsg = getApiMessage(
        ax,
        status ? `Request failed (${status})` : "Network error"
      );

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
      new ApiError(getApiMessage(error, "Unexpected error"), {
        cause: error,
      })
    );
  }
);

export const isCancel = axios.isCancel;
