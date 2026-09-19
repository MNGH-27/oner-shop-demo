"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getShopSettings, mediaUrl } from "@core/services/api/shop.api";
import { apiClient } from "@core/services/http/api-client";
import {
  cartItemAvailableStock,
  selectCartSubtotal,
  useCartStore,
} from "@core/services/stores/cart.store";
import type { CouponPreview } from "@core/types/shop.types";
import { discountedPrice, formatPrice } from "@core/utils/format.utils";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.removeItem);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [validating, setValidating] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void getShopSettings().then((settings) => {
      if (active) setShippingCost(settings?.shippingCost ?? null);
    });
    return () => {
      active = false;
    };
  }, []);
  const originalSubtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const productDiscount = originalSubtotal - subtotal;
  const couponEligible = Boolean(coupon && subtotal >= coupon.minimumAmount);
  const calculatedCoupon =
    couponEligible && coupon
      ? Math.round((subtotal * coupon.percent) / 100)
      : 0;
  const couponDiscount = coupon
    ? Math.min(calculatedCoupon, coupon.maximumDiscountAmount)
    : 0;

  const apply = async () => {
    if (!code.trim()) return;
    setValidating(true);
    try {
      const { data } = await apiClient.post<CouponPreview>(
        "/coupons/validate",
        { code, amount: subtotal },
      );
      setCoupon(data);
      setCode(data.code);
      toast.success("کد تخفیف معتبر است");
    } catch {
      setCoupon(null);
      toast.error("کد تخفیف معتبر نیست");
    } finally {
      setValidating(false);
    }
  };

  const checkoutHref = couponEligible
    ? `/checkout?coupon=${encodeURIComponent(coupon!.code)}`
    : "/checkout";

  return (
    <div className="cart-page">
      <header className="page-hero">
        <span className="eyebrow">مرحله اول خرید</span>
        <h1>سبد خرید شما</h1>
        <p>محصولات و انتخاب‌های خود را پیش از ثبت سفارش بررسی کنید.</p>
      </header>
      {!items.length ? (
        <div className="cart-empty">
          <ShoppingBag size={42} />
          <h2>سبد خرید خالی است</h2>
          <Link className="primary-btn" href="/products">
            مشاهده محصولات
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items">
            <h2>محصولات</h2>
            {items.map((item) => {
              const id = item.product.id ?? item.product._id;
              const finalPrice = discountedPrice(
                item.product.price,
                item.product.discountPercent,
              );
              const maximum = cartItemAvailableStock(
                item.product,
                item.color,
                item.size,
              );
              return (
                <article key={item.key} className="cart-item">
                  <Link href={`/products/${id}`} className="cart-item-image">
                    <Image
                      src={mediaUrl(item.product.images[0])}
                      alt={item.product.name}
                      fill
                      sizes="120px"
                    />
                  </Link>
                  <div className="cart-item-info">
                    <Link
                      href={`/products/${id}`}
                      className="cart-product-link"
                    >
                      {item.product.name}
                    </Link>
                    <small>
                      {[item.color, item.size].filter(Boolean).join(" / ") ||
                        "بدون تنوع"}
                    </small>
                    <small className="cart-stock">
                      موجودی قابل سفارش: {maximum.toLocaleString("fa-IR")} عدد
                    </small>
                    {item.product.discountPercent ? (
                      <span className="discount-badge">
                        {item.product.discountPercent.toLocaleString("fa-IR")}٪
                        تخفیف
                      </span>
                    ) : null}
                    <strong>{formatPrice(finalPrice)}</strong>
                    {item.product.discountPercent ? (
                      <del>{formatPrice(item.product.price)}</del>
                    ) : null}
                  </div>
                  <div className="cart-quantity">
                    <button
                      disabled={item.quantity <= 1}
                      onClick={() => setQuantity(item.key, item.quantity - 1)}
                      aria-label="کاهش تعداد"
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.quantity.toLocaleString("fa-IR")}</span>
                    <button
                      disabled={item.quantity >= maximum}
                      onClick={() => setQuantity(item.key, item.quantity + 1)}
                      aria-label="افزایش تعداد"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    className="cart-remove"
                    onClick={() => remove(item.key)}
                  >
                    <Trash2 size={17} /> حذف
                  </button>
                </article>
              );
            })}
          </section>
          <aside className="cart-summary">
            <h2>جمع کل سبد خرید</h2>
            <p>
              <span>جمع قیمت اصلی</span>
              <b>{formatPrice(originalSubtotal)}</b>
            </p>
            {productDiscount > 0 ? (
              <p className="product-discount-row">
                <span>تخفیف کالاها</span>
                <b>− {formatPrice(productDiscount)}</b>
              </p>
            ) : null}
            <p>
              <span>مجموع پس از تخفیف</span>
              <b>{formatPrice(subtotal)}</b>
            </p>
            <div className="coupon-box">
              <label htmlFor="coupon-code">کد تخفیف</label>
              <div>
                <input
                  id="coupon-code"
                  value={code}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    setCode(value);
                    if (coupon && value !== coupon.code) setCoupon(null);
                  }}
                  placeholder="ONER10"
                  dir="ltr"
                />
                <button onClick={apply} disabled={validating || !code.trim()}>
                  {validating ? "..." : "اعمال"}
                </button>
              </div>
              {couponEligible && coupon ? (
                <small>کد {coupon.code} در ثبت سفارش بررسی نهایی می‌شود.</small>
              ) : coupon ? (
                <small className="coupon-warning">
                  مبلغ سبد از حداقل خرید این کد کمتر است.
                </small>
              ) : null}
            </div>
            <p>
              <span>هزینه ارسال</span>
              <b>
                {shippingCost === null
                  ? "در حال محاسبه…"
                  : shippingCost
                    ? formatPrice(shippingCost)
                    : "رایگان"}
              </b>
            </p>
            {couponDiscount > 0 ? (
              <p className="coupon-discount">
                <span>تخفیف کد</span>
                <b>− {formatPrice(couponDiscount)}</b>
              </p>
            ) : null}
            <div className="cart-payable">
              <span>مبلغ قابل پرداخت</span>
              <b>
                {shippingCost === null
                  ? "—"
                  : formatPrice(
                      Math.max(
                        0,
                        subtotal + shippingCost - couponDiscount,
                      ),
                    )}
              </b>
            </div>
            <Link className="primary-btn" href={checkoutHref}>
              ادامه و ثبت سفارش
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
