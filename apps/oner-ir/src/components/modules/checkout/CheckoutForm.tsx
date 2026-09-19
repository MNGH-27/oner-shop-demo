"use client";

import axios from "axios";
import { CreditCard, MapPin, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AddressFields } from "@components/modules/address/AddressFields";
import { getAddresses } from "@core/services/api/address.api";
import { checkout, replaceRemoteCart } from "@core/services/api/order.api";
import { getShopSettings } from "@core/services/api/shop.api";
import { apiClient } from "@core/services/http/api-client";
import {
  selectCartSubtotal,
  useCartStore,
} from "@core/services/stores/cart.store";
import { useAuthStore } from "@core/services/stores/auth.store";
import type { CouponPreview, CustomerAddress } from "@core/types/shop.types";
import { formatPrice } from "@core/utils/format.utils";

function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "ثبت سفارش انجام نشد";
  const message = error.response?.data?.message;
  return Array.isArray(message)
    ? message.join("، ")
    : typeof message === "string"
      ? message
      : "ثبت سفارش انجام نشد؛ اطلاعات را دوباره بررسی کنید";
}

export function CheckoutForm({
  initialCoupon = "",
}: {
  initialCoupon?: string;
}) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const subtotal = useCartStore(selectCartSubtotal);
  const [addresses, setAddresses] = useState<CustomerAddress[]>(
    user?.addresses ?? [],
  );
  const [selectedAddressId, setSelectedAddressId] = useState(
    user?.addresses?.find((item) => item.isDefault)?.id ??
      user?.addresses?.[0]?.id ??
      "new",
  );
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    if (!initialCoupon || !subtotal) return;
    let active = true;
    void apiClient
      .post<CouponPreview>("/coupons/validate", {
        code: initialCoupon,
        amount: subtotal,
      })
      .then(({ data }) => {
        if (active) setCoupon(data);
      })
      .catch(() => {
        if (active) setCouponError("کد تخفیف دیگر معتبر نیست");
      });
    return () => {
      active = false;
    };
  }, [initialCoupon, subtotal]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const apply = (next: CustomerAddress[]) => {
      if (!active) return;
      setAddresses(next);
      setSelectedAddressId(
        next.find((item) => item.isDefault)?.id ?? next[0]?.id ?? "new",
      );
      setUser({ ...user, addresses: next });
    };
    void getAddresses()
      .then(apply)
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // The full user object is updated when addresses are refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, setUser]);

  if (!user) {
    return (
      <section className="checkout-login">
        <ShoppingBag size={42} />
        <h2>برای ثبت سفارش وارد حساب شوید</h2>
        <p>سبد خرید شما حفظ می‌شود و پس از ورود می‌توانید ادامه دهید.</p>
        <Link href="/profile" className="primary-btn">
          ورود یا ساخت حساب
        </Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="checkout-login">
        <ShoppingBag size={42} />
        <h2>سبد خرید خالی است</h2>
        <Link href="/products" className="primary-btn">
          مشاهده محصولات
        </Link>
      </section>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const remoteItems = items.flatMap((item) => {
        const productId = item.product.id ?? item.product._id;
        return productId
          ? [
              {
                productId,
                quantity: item.quantity,
                color: item.color,
                size: item.size,
              },
            ]
          : [];
      });
      if (remoteItems.length !== items.length) {
        throw new Error("Invalid cart product");
      }
      await replaceRemoteCart(remoteItems);

      const isNewAddress = selectedAddressId === "new";
      const response = await checkout({
        addressId: isNewAddress ? undefined : selectedAddressId,
        shippingAddress: isNewAddress
          ? {
              title: String(form.get("title") ?? "").trim(),
              fullName: String(form.get("fullName") ?? "").trim(),
              phone: String(form.get("phone") ?? "").trim(),
              province: String(form.get("province") ?? "").trim(),
              city: String(form.get("city") ?? "").trim(),
              addressLine: String(form.get("addressLine") ?? "").trim(),
              postalCode: String(form.get("postalCode") ?? "").trim(),
              isDefault: form.get("isDefault") === "on",
            }
          : undefined,
        notes: String(form.get("notes") ?? "").trim() || undefined,
        couponCode: coupon?.code,
      });
      if (!response.paymentUrl) throw new Error("Missing payment URL");
      clearCart();
      window.location.assign(response.paymentUrl);
    } catch (error) {
      toast.error(errorMessage(error));
      setSubmitting(false);
    }
  };

  const discount = coupon?.discountAmount ?? 0;
  return (
    <form className="checkout-layout" onSubmit={submit}>
      <div className="checkout-main">
        <section className="checkout-address-selector">
          <div className="checkout-section-heading">
            <div>
              <span>مرحله ۱</span>
              <h2>نشانی گیرنده</h2>
            </div>
            <MapPin size={22} />
          </div>
          {addresses.length ? (
            <div className="checkout-address-list">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={
                    selectedAddressId === address.id
                      ? "checkout-address-option selected"
                      : "checkout-address-option"
                  }
                >
                  <input
                    type="radio"
                    name="addressChoice"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  <span className="address-option-copy">
                    <b>
                      {address.title}
                      {address.isDefault ? <small>پیش‌فرض</small> : null}
                    </b>
                    <span>
                      {address.province}، {address.city}، {address.addressLine}
                    </span>
                    <small>
                      {address.fullName} ·{" "}
                      <span dir="ltr">{address.phone}</span> · کد پستی{" "}
                      <span dir="ltr">{address.postalCode}</span>
                    </small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="checkout-no-address">
              هنوز نشانی‌ای ندارید؛ اولین نشانی شما پس از ثبت سفارش ذخیره
              می‌شود.
            </p>
          )}
          <label
            className={
              selectedAddressId === "new"
                ? "checkout-address-option checkout-new-option selected"
                : "checkout-address-option checkout-new-option"
            }
          >
            <input
              type="radio"
              name="addressChoice"
              value="new"
              checked={selectedAddressId === "new"}
              onChange={() => setSelectedAddressId("new")}
            />
            <Plus size={18} />
            <b>ثبت و استفاده از نشانی جدید</b>
          </label>
        </section>

        {selectedAddressId === "new" ? (
          <section className="checkout-address">
            <h2>اطلاعات نشانی جدید</h2>
            <AddressFields user={user} />
          </section>
        ) : null}

        <section className="checkout-notes">
          <label>
            توضیحات سفارش (اختیاری)
            <textarea name="notes" maxLength={1000} rows={3} />
          </label>
        </section>
      </div>

      <aside className="checkout-summary">
        <h2>خلاصه سفارش</h2>
        <p>
          <span>تعداد کالا</span>
          <b>
            {items
              .reduce((sum, item) => sum + item.quantity, 0)
              .toLocaleString("fa-IR")}
          </b>
        </p>
        <p>
          <span>مبلغ کالاها</span>
          <b>{formatPrice(subtotal)}</b>
        </p>
        <p>
          <span>ارسال</span>
          <b>
            {shippingCost === null
              ? "در حال محاسبه…"
              : shippingCost
                ? formatPrice(shippingCost)
                : "رایگان"}
          </b>
        </p>
        {coupon ? (
          <p className="coupon-discount">
            <span>تخفیف {coupon.code}</span>
            <b>− {formatPrice(discount)}</b>
          </p>
        ) : null}
        {couponError ? (
          <small className="field-error">{couponError}</small>
        ) : null}
        <div className="checkout-total">
          <span>مبلغ قابل پرداخت</span>
          <b>
            {shippingCost === null
              ? "پس از محاسبه ارسال"
              : formatPrice(Math.max(0, subtotal + shippingCost - discount))}
          </b>
        </div>
        <div className="checkout-payment">
          <CreditCard size={20} />
          <span>
            <b>پرداخت آنلاین</b>
            <small>انتقال امن به درگاه بانکی</small>
          </span>
        </div>
        <small>
          قیمت، موجودی، هزینه ارسال و تخفیف پیش از اتصال به درگاه دوباره بررسی
          می‌شوند.
        </small>
        <button
          className="primary-btn"
          disabled={submitting || shippingCost === null}
        >
          {submitting ? "در حال اتصال به درگاه..." : "پرداخت و ثبت سفارش"}
        </button>
      </aside>
    </form>
  );
}
