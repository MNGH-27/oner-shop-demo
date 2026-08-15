"use client";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import type { StoreProduct } from "@core/types/shop.types";
import { useCartStore } from "@core/services/stores/cart.store";
export function ProductPurchase({ product }: { product: StoreProduct }) {
  const firstVariant = product.variants?.find((item) => item.stock > 0) ?? product.variants?.[0];
  const [color, setColor] = useState(firstVariant?.color ?? product.colors?.[0]?.name ?? "");
  const [size, setSize] = useState(firstVariant?.size ?? product.sizes?.[0]?.label ?? "");
  const [quantity, setQuantity] = useState(1); const addItem = useCartStore((state) => state.addItem);
  const variant = useMemo(() => product.variants?.find((v) => (v.color ?? "") === color && (v.size ?? "") === size), [product.variants, color, size]);
  const available = product.variants?.length ? (variant?.stock ?? 0) : product.stock;
  const notifyHref = `/contact?${new URLSearchParams({ subject: "درخواست موجودی", product: product.name, color, size }).toString()}`;
  useEffect(() => { setQuantity((current) => Math.max(1, Math.min(current, available || 1))); }, [available]);
  const chooseColor = (nextColor: string) => { setColor(nextColor); const matching = product.variants?.find((item) => item.color === nextColor && item.size === size) ?? product.variants?.find((item) => item.color === nextColor); if (matching?.size) setSize(matching.size); };
  return <div className="purchase-box">
    {product.colors?.length ? <fieldset><legend>رنگ</legend><div className="choice-row">{product.colors.map((item) => { const exists = !product.variants?.length || product.variants.some((entry) => entry.color === item.name); return <button key={item.name} disabled={!exists} className={color === item.name ? "selected" : ""} onClick={() => chooseColor(item.name)}>{item.name}</button> })}</div></fieldset> : null}
    {product.sizes?.length ? <fieldset><legend>سایز</legend><div className="choice-row ltr">{product.sizes.map((item) => { const selectedVariant = product.variants?.find((entry) => entry.color === color && entry.size === item.label), exists = !product.variants?.length || Boolean(selectedVariant); return <button key={item.label} disabled={!exists} className={size === item.label ? "selected" : ""} onClick={() => setSize(item.label)}>{item.label}{selectedVariant ? ` (${selectedVariant.stock.toLocaleString("fa-IR")})` : ""}</button> })}</div></fieldset> : null}
    <p className={available > 0 ? "stock-ok" : "stock-out"}>{available > 0 ? `${available.toLocaleString("fa-IR")} عدد موجود` : "ناموجود"}</p>
    {available < 1 ? <div className="stock-notify"><strong>این ترکیب فعلاً موجود نیست</strong><p>برای اطلاع از زمان موجودشدن یا ثبت درخواست، با ما در ارتباط باشید.</p><Link href={notifyHref}>ثبت درخواست موجودی</Link></div> : null}
    <div className="add-row"><div className="quantity"><button disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity.toLocaleString("fa-IR")}</span><button disabled={available < 1 || quantity >= available} onClick={() => setQuantity(Math.min(available, quantity + 1))}>+</button></div><button className="primary-btn" disabled={available < 1 || (!variant && Boolean(product.variants?.length))} onClick={() => { addItem(product, quantity, color || undefined, size || undefined); toast.success("محصول به سبد خرید اضافه شد"); }}><ShoppingBag size={18}/> افزودن به سبد خرید</button></div>
  </div>;
}
