import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoreProduct } from "@core/types/shop.types";
import { discountedPrice } from "@core/utils/format.utils";

export interface CartLine { key: string; product: StoreProduct; quantity: number; color?: string; size?: string }
interface CartState {
  items: CartLine[]; isOpen: boolean; hasHydrated: boolean;
  setOpen: (open: boolean) => void; setHasHydrated: (value: boolean) => void;
  addItem: (product: StoreProduct, quantity?: number, color?: string, size?: string) => void;
  removeItem: (key: string) => void; clear: () => void;
  setQuantity: (key: string, quantity: number) => void;
  replaceProduct: (product: StoreProduct) => void;
}
const productId = (product: StoreProduct) => product.id ?? product._id ?? "";
export function cartItemAvailableStock(product: StoreProduct, color?: string, size?: string) {
  const variant = product.variants?.find((item) => (item.color ?? "") === (color ?? "") && (item.size ?? "") === (size ?? ""));
  return Math.max(0, product.variants?.length ? (variant?.stock ?? 0) : (product.stock ?? 0));
}
export const useCartStore = create<CartState>()(persist((set) => ({
  items: [], isOpen: false, hasHydrated: false,
  setOpen: (isOpen) => set({ isOpen }), setHasHydrated: (hasHydrated) => set({ hasHydrated }),
  addItem: (product, quantity = 1, color, size) => set((state) => {
    const key = `${productId(product)}::${color ?? ""}::${size ?? ""}`;
    const found = state.items.find((item) => item.key === key);
    const maximum = cartItemAvailableStock(product, color, size);
    if (maximum < 1) return { isOpen: true, items: state.items };
    return { isOpen: true, items: found ? state.items.map((item) => item.key === key ? { ...item, quantity: Math.min(maximum, item.quantity + quantity) } : item) : [...state.items, { key, product, quantity: Math.min(maximum, Math.max(1, quantity)), color, size }] };
  }),
  removeItem: (key) => set((state) => ({ items: state.items.filter((item) => item.key !== key) })),
  setQuantity: (key, quantity) => set((state) => ({ items: state.items.flatMap((item) => { if (item.key !== key) return [item]; const maximum = cartItemAvailableStock(item.product, item.color, item.size); return maximum > 0 ? [{ ...item, quantity: Math.min(maximum, Math.max(1, quantity)) }] : []; }) })),
  replaceProduct: (product) => set((state) => ({ items: state.items.flatMap((item) => { if (productId(item.product) !== productId(product)) return [item]; const maximum = cartItemAvailableStock(product, item.color, item.size); return maximum > 0 ? [{ ...item, product, quantity: Math.max(1, Math.min(item.quantity, maximum)) }] : []; }) })),
  clear: () => set({ items: [] }),
}), { name: "oner-cart", partialize: (state) => ({ items: state.items }), onRehydrateStorage: () => (state) => state?.setHasHydrated(true) }));
export const selectCartCount = (state: CartState) => state.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state: CartState) => state.items.reduce((sum, item) => sum + discountedPrice(item.product.price, item.product.discountPercent) * item.quantity, 0);
