"use client";

import axios from "axios";
import { useEffect } from "react";
import { apiClient } from "@core/services/http/api-client";
import { useCartStore } from "@core/services/stores/cart.store";
import type { StoreProduct } from "@core/types/shop.types";

export function CartSynchronizer() {
  const items = useCartStore((state) => state.items);
  const replaceProduct = useCartStore((state) => state.replaceProduct);
  const removeItem = useCartStore((state) => state.removeItem);
  const ids = [
    ...new Set(
      items
        .map((item) => item.product.id ?? item.product._id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const idKey = ids.join(",");

  useEffect(() => {
    if (!idKey) return;
    void Promise.all(
      idKey.split(",").map(async (id) => {
        try {
          const { data } = await apiClient.get<StoreProduct>(`/products/${id}`);
          replaceProduct(data);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            useCartStore
              .getState()
              .items.filter(
                (item) => (item.product.id ?? item.product._id) === id,
              )
              .forEach((item) => removeItem(item.key));
          }
        }
      }),
    );
  }, [idKey, removeItem, replaceProduct]);

  return null;
}
