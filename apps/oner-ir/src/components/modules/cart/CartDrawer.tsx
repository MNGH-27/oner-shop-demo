"use client";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { mediaUrl } from "@core/services/api/shop.api";
import { selectCartSubtotal, useCartStore } from "@core/services/stores/cart.store";
import { discountedPrice, formatPrice } from "@core/utils/format.utils";
export function CartDrawer() {
  const items = useCartStore((state) => state.items); const open = useCartStore((state) => state.isOpen); const setOpen = useCartStore((state) => state.setOpen); const removeItem = useCartStore((state) => state.removeItem); const subtotal = useCartStore(selectCartSubtotal);
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><div className="drawer-wrap"><Dialog.Overlay className="drawer-backdrop"/><Dialog.Content className="cart-drawer" aria-describedby={undefined}>
    <div className="drawer-head"><Dialog.Title>سبد خرید</Dialog.Title><Dialog.Close aria-label="بستن سبد"><X size={22}/></Dialog.Close></div>
    <div className="drawer-lines">{items.length === 0 ? <div className="empty-cart">سبد خرید شما خالی است.<Link href="/products" onClick={() => setOpen(false)}>مشاهده محصولات</Link></div> : items.map((item) => { const finalPrice = discountedPrice(item.product.price, item.product.discountPercent); return <article key={item.key} className="cart-line">
      <div className="cart-thumb"><Image src={mediaUrl(item.product.images[0])} alt={item.product.name} fill sizes="80px"/></div>
      <div><b>{item.product.name}</b><small>{[item.color, item.size].filter(Boolean).join(" / ")}</small>{item.product.discountPercent ? <span className="drawer-discount">{item.product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف</span> : null}<span>{item.quantity.toLocaleString("fa-IR")} × <strong>{formatPrice(finalPrice)}</strong></span>{item.product.discountPercent ? <del>{formatPrice(item.product.price)}</del> : null}</div>
      <button onClick={() => removeItem(item.key)} aria-label="حذف"><Trash2 size={17}/></button>
    </article> })}</div>
    {items.length ? <div className="drawer-foot"><p><span>جمع پس از تخفیف کالاها</span><b>{formatPrice(subtotal)}</b></p><Link href="/cart" className="primary-btn" onClick={() => setOpen(false)}><ShoppingBag size={18}/> مشاهده سبد و ادامه خرید</Link></div> : null}
  </Dialog.Content></div></Dialog.Portal></Dialog.Root>;
}
