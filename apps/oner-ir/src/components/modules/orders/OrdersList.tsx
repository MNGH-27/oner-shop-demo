"use client";

import { CreditCard, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyOrders, requestOrderPayment } from "@core/services/api/order.api";
import { toast } from "react-toastify";
import { useAuthStore } from "@core/services/stores/auth.store";
import type { StoreOrder, StoreOrderStatus } from "@core/types/shop.types";
import { formatPrice } from "@core/utils/format.utils";

const statusLabels: Record<StoreOrderStatus, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export function OrdersList() {
  const user = useAuthStore((state) => state.user);
  const [result, setResult] = useState<{
    userId: string;
    orders: StoreOrder[];
    failed: boolean;
  } | null>(null);
  const [payingOrderId, setPayingOrderId] = useState("");

  const pay = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      const response = await requestOrderPayment(orderId);
      window.location.assign(response.paymentUrl);
    } catch {
      toast.error("اتصال به درگاه انجام نشد");
      setPayingOrderId("");
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getMyOrders()
      .then((result) => {
        if (active)
          setResult({ userId: user.id, orders: result.items, failed: false });
      })
      .catch(() => {
        if (active) setResult({ userId: user.id, orders: [], failed: true });
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="orders-empty">
        <PackageOpen size={42} />
        <h2>برای دیدن سفارش‌ها وارد حساب شوید</h2>
        <Link className="primary-btn" href="/profile">
          ورود به حساب
        </Link>
      </div>
    );
  }
  if (!result || result.userId !== user.id)
    return <div className="orders-empty">در حال دریافت سفارش‌ها...</div>;
  if (result.failed)
    return <div className="orders-empty">دریافت سفارش‌ها انجام نشد.</div>;
  const orders = result.orders;
  if (!orders.length) {
    return (
      <div className="orders-empty">
        <PackageOpen size={42} />
        <h2>هنوز سفارشی ثبت نکرده‌اید</h2>
        <Link className="primary-btn" href="/products">
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  return (
    <section className="orders-list">
      {orders.map((order) => (
        <article key={order.id ?? order._id} className="order-card">
          <header>
            <div>
              <small>شماره سفارش</small>
              <b dir="ltr">{order.orderNumber}</b>
            </div>
            <span className={`order-status ${order.status}`}>
              {statusLabels[order.status]}
            </span>
          </header>
          <div className="order-card-meta">
            <span>{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
            <span>{order.items.length.toLocaleString("fa-IR")} ردیف کالا</span>
            <b>{formatPrice(order.totalAmount)}</b>
          </div>
          <div className="order-item-names">
            {order.items.map((item) => item.name).join("، ")}
          </div>
          {order.status !== "cancelled" && order.paymentStatus !== "paid" ? (
            <button
              className="order-pay-button"
              onClick={() => pay(order.id)}
              disabled={Boolean(payingOrderId)}
            >
              <CreditCard size={16} />
              {payingOrderId === order.id
                ? "در حال اتصال..."
                : "پرداخت آنلاین سفارش"}
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}
