"use client";
import { useEffect } from "react";
import { apiClient } from "@core/services/http/api-client";
import { useCartStore } from "@core/services/stores/cart.store";
import type { StoreProduct } from "@core/types/shop.types";
export function CartSynchronizer() {
  const items = useCartStore((state) => state.items); const replaceProduct = useCartStore((state) => state.replaceProduct);
  const ids = items.map((item) => item.product.id ?? item.product._id).filter(Boolean).join(",");
  useEffect(() => { if (!ids) return; void Promise.all(ids.split(",").map(async (id) => { try { const { data } = await apiClient.get<StoreProduct>(`/products/${id}`); replaceProduct(data) } catch { /* محصول حذف‌شده در سبد فعلاً حفظ می‌شود */ } })) }, [ids, replaceProduct]);
  return null;
}
