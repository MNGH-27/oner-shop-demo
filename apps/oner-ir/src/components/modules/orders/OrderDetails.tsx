"use client";

import axios from "axios";
import { ArrowRight, CreditCard, PackageOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AccountLoginRequired } from "@components/modules/account/AccountLoginRequired";
import { getMyOrder, requestOrderPayment } from "@core/services/api/order.api";
import { mediaUrl } from "@core/services/api/shop.api";
import { useAuthStore } from "@core/services/stores/auth.store";
import { useCartStore } from "@core/services/stores/cart.store";
import type { StoreOrder } from "@core/types/shop.types";
import { formatPrice } from "@core/utils/format.utils";
import { ReservationTimer } from "./ReservationTimer";

const labels = {
  pending: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export function OrderDetails({ orderId }: { orderId: string }) {
  const user = useAuthStore((state) => state.user);
  const clearCart = useCartStore((state) => state.clear);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getMyOrder(orderId)
      .then((value) => {
        if (active) setOrder(value);
      })
      .catch(() => {
        if (active) setOrder(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, user]);

  const expire = () => {
    setOrder((current) =>
      current
        ? {
            ...current,
            status: "cancelled",
            paymentStatus: "failed",
            reservationStatus: "released",
            reservationExpiresAt: null,
          }
        : current,
    );
    clearCart();
    toast.info(
      "مهلت پرداخت تمام شد؛ موجودی آزاد شد و باید کالا را دوباره انتخاب کنید.",
    );
  };

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const result = await requestOrderPayment(order.id);
      window.location.assign(result.paymentUrl);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof message === "string" ? message : "اتصال به درگاه انجام نشد",
      );
      setPaying(false);
    }
  };

  return (
    <AccountLoginRequired>
      {loading ? (
        <div className="account-state">در حال دریافت جزئیات سفارش…</div>
      ) : !order ? (
        <div className="account-state">
          <PackageOpen size={36} />
          <h2>سفارش پیدا نشد</h2>
          <Link href="/profile/orders">بازگشت به سفارش‌ها</Link>
        </div>
      ) : (
        <article className="order-details">
          <header className="order-details-head">
            <div>
              <Link href="/profile/orders">
                <ArrowRight size={16} /> بازگشت به سفارش‌ها
              </Link>
              <h2>جزئیات سفارش</h2>
              <b dir="ltr">{order.orderNumber}</b>
            </div>
            <span className={`order-status ${order.status}`}>
              {labels[order.status]}
            </span>
          </header>

          {order.reservationStatus === "reserved" &&
          order.reservationExpiresAt ? (
            <ReservationTimer
              expiresAt={order.reservationExpiresAt}
              onExpire={expire}
            />
          ) : order.reservationStatus === "released" ? (
            <div className="reservation-expired-panel">
              مهلت پرداخت این سفارش تمام شده، رزرو موجودی آزاد شده و برای خرید
              باید کالا را دوباره انتخاب کنید.
              <Link href="/products">انتخاب دوباره محصولات</Link>
            </div>
          ) : null}

          <section className="order-details-items">
            <h3>کالاهای سفارش</h3>
            {order.items.map((item) => (
              <div className="order-details-item" key={item.id}>
                <div className="order-details-image">
                  <Image
                    src={mediaUrl(item.image)}
                    alt={item.name}
                    fill
                    sizes="88px"
                  />
                </div>
                <div>
                  <b>{item.name}</b>
                  <small>
                    {[
                      item.color && `رنگ: ${item.color}`,
                      item.size && `سایز: ${item.size}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "بدون تنوع"}
                  </small>
                  <span>تعداد: {item.quantity.toLocaleString("fa-IR")}</span>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </section>

          <div className="order-details-grid">
            <section>
              <h3>خلاصه پرداخت</h3>
              <p>
                <span>مبلغ کالاها</span>
                <b>{formatPrice(order.subtotal)}</b>
              </p>
              <p>
                <span>هزینه ارسال</span>
                <b>{formatPrice(order.shippingCost)}</b>
              </p>
              {order.couponDiscount ? (
                <p>
                  <span>تخفیف</span>
                  <b>− {formatPrice(order.couponDiscount)}</b>
                </p>
              ) : null}
              <p className="order-details-total">
                <span>مبلغ کل</span>
                <b>{formatPrice(order.totalAmount)}</b>
              </p>
            </section>
            <section>
              <h3>نشانی تحویل</h3>
              {order.shippingAddress ? (
                <address>
                  <b>{order.shippingAddress.fullName}</b>
                  <span>
                    {order.shippingAddress.province}، {order.shippingAddress.city}
                  </span>
                  <span>{order.shippingAddress.addressLine}</span>
                  <small>
                    کد پستی: <span dir="ltr">{order.shippingAddress.postalCode}</span>
                  </small>
                  <small dir="ltr">{order.shippingAddress.phone}</small>
                </address>
              ) : (
                <p>نشانی ثبت نشده است.</p>
              )}
            </section>
          </div>

          {order.status !== "cancelled" &&
          order.paymentStatus !== "paid" &&
          order.reservationStatus === "reserved" ? (
            <button
              className="primary-btn order-details-pay"
              onClick={pay}
              disabled={paying}
            >
              <CreditCard size={18} />
              {paying ? "در حال اتصال…" : "پرداخت این سفارش"}
            </button>
          ) : null}
        </article>
      )}
    </AccountLoginRequired>
  );
}
