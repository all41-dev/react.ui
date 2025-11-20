import type { AxiosRequestConfig } from "axios";
import { apiClient } from "./client";

export async function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<T>(url, config);
  return res.data as T;
}

export async function post<T = unknown, B = any>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.post<T>(url, body, config);
  return res.data as T;
}

export async function put<T = unknown, B = any>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.put<T>(url, body, config);
  return res.data as T;
}

export async function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<T>(url, config);
  return res.data as T;
}
