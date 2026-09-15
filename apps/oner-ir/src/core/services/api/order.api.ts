import { apiClient } from "@core/services/http/api-client";
import type {
  AddToCartInput,
  CustomerAddress,
  PaginatedOrders,
  StoreOrder,
} from "@core/types/shop.types";

export async function replaceRemoteCart(items: AddToCartInput[]) {
  const { data } = await apiClient.put("/cart", { items });
  return data;
}

export async function checkout(payload: {
  addressId?: string;
  shippingAddress?: Omit<
    CustomerAddress,
    "id" | "_id" | "createdAt" | "updatedAt"
  >;
  notes?: string;
  couponCode?: string;
}) {
  const { data } = await apiClient.post<{
    order: StoreOrder;
    paymentUrl: string;
  }>("/orders/checkout", payload);
  return data;
}

export async function getMyOrders(page = 1) {
  const { data } = await apiClient.get<PaginatedOrders>("/orders", {
    params: { page, limit: 20 },
  });
  return data;
}

export async function getMyOrder(orderId: string) {
  const { data } = await apiClient.get<StoreOrder>(`/orders/${orderId}`);
  return data;
}

export async function requestOrderPayment(orderId: string) {
  const { data } = await apiClient.post<{ paymentUrl: string }>(
    `/payments/orders/${orderId}/request`,
  );
  return data;
}
