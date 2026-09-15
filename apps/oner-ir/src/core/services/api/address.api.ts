import { apiClient } from "@core/services/http/api-client";
import type { CustomerAddress } from "@core/types/shop.types";

export type AddressInput = Omit<
  CustomerAddress,
  "id" | "_id" | "createdAt" | "updatedAt"
>;

export async function getAddresses() {
  const { data } = await apiClient.get<CustomerAddress[]>("/addresses");
  return data;
}

export async function createAddress(payload: AddressInput) {
  const { data } = await apiClient.post<CustomerAddress>("/addresses", payload);
  return data;
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressInput>,
) {
  const { data } = await apiClient.patch<CustomerAddress>(
    `/addresses/${id}`,
    payload,
  );
  return data;
}

export async function setDefaultAddress(id: string) {
  const { data } = await apiClient.patch<CustomerAddress>(
    `/addresses/${id}/default`,
  );
  return data;
}

export async function deleteAddress(id: string) {
  await apiClient.delete(`/addresses/${id}`);
}
