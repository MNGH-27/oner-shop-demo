import { apiClient } from "@core/services/http/api-client";
import type { Customer } from "@core/types/shop.types";

export async function requestOtp(phone: string) {
  const { data } = await apiClient.post<{
    message: string;
    expiresIn: number;
    retryAfter: number;
  }>("/auth/otp/request", { phone });
  return data;
}

export async function verifyOtp(phone: string, code: string) {
  const { data } = await apiClient.post<{
    accessToken: string;
    user: Customer;
    isNewUser: boolean;
  }>("/auth/otp/verify", { phone, code });
  return data;
}

export async function loginCustomer(phone: string, password: string) {
  const { data } = await apiClient.post<{
    accessToken: string;
    user: Customer;
  }>("/auth/login", { phone, password });
  return data;
}
export async function changePassword(payload: {
  currentPassword?: string;
  newPassword: string;
}) {
  const { data } = await apiClient.patch<{ message: string }>(
    "/auth/password",
    payload,
  );
  return data;
}
export async function registerCustomer(payload: {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}) {
  const { data } = await apiClient.post<{
    accessToken: string;
    user: Customer;
  }>("/auth/register", payload);
  return data;
}
export async function getProfile() {
  const { data } = await apiClient.get<Customer>("/auth/me");
  return data;
}
export async function updateProfile(payload: Partial<Customer>) {
  const { data } = await apiClient.patch<Customer>("/auth/me", payload);
  return data;
}
