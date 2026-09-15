"use client";

import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getMyOrder, requestOrderPayment } from "@core/services/api/order.api";
import { useAuthStore } from "@core/services/stores/auth.store";
import { useCartStore } from "@core/services/stores/cart.store";
import type { StoreOrder } from "@core/types/shop.types";
import { formatPrice } from "@core/utils/format.utils";

export function PaymentResult({
  orderId,
  callbackResult,
}: {
  orderId: string;
  callbackResult: string;
}) {
  const user = useAuthStore((state) => state.user);
  const clear = useCartStore((state) => state.clear);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!user || !orderId) return;
    let active = true;
    void getMyOrder(orderId)
      .then((next) => {
        if (!active) return;
        setOrder(next);
        if (next.paymentStatus === "paid") clear();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clear, orderId, user]);

  const retry = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const response = await requestOrderPayment(order.id);
      window.location.assign(response.paymentUrl);
    } catch {
      toast.error("اتصال دوباره به درگاه انجام نشد");
      setRetrying(false);
    }
  };

  if (!user) {
    return (
      <section className="payment-result-card failed">
        <XCircle size={48} />
        <h1>برای مشاهده نتیجه وارد حساب شوید</h1>
        <Link className="primary-btn" href="/profile">
          ورود به حساب
        </Link>
      </section>
    );
  }

  if (!orderId) {
    return (
      <section className="payment-result-card failed">
        <XCircle size={48} />
        <h1>اطلاعات تراکنش کامل نیست</h1>
        <Link className="primary-btn" href="/orders">
          مشاهده سفارش‌ها
        </Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="payment-result-card">
        <LoaderCircle className="spin" size={42} />
        <h1>در حال بررسی نتیجه پرداخت</h1>
      </section>
    );
  }

  const paid = order?.paymentStatus === "paid";
  return (
    <section className={`payment-result-card ${paid ? "paid" : "failed"}`}>
      {paid ? <CheckCircle2 size={54} /> : <XCircle size={54} />}
      <span>{paid ? "پرداخت تأیید شد" : "پرداخت کامل نشد"}</span>
      <h1>{paid ? "سفارش شما با موفقیت ثبت شد" : "دوباره تلاش کنید"}</h1>
      {order ? (
        <div className="payment-result-details">
          <p>
            <span>شماره سفارش</span>
            <b dir="ltr">{order.orderNumber}</b>
          </p>
          <p>
            <span>مبلغ</span>
            <b>{formatPrice(order.totalAmount)}</b>
          </p>
        </div>
      ) : (
        <p>
          {callbackResult === "failed"
            ? "تراکنش تأیید نشد یا از پرداخت منصرف شدید."
            : "اطلاعات سفارش پیدا نشد."}
        </p>
      )}
      <div className="payment-result-actions">
        {!paid && order ? (
          <button className="primary-btn" onClick={retry} disabled={retrying}>
            <RotateCcw size={17} />
            {retrying ? "در حال اتصال..." : "پرداخت دوباره"}
          </button>
        ) : null}
        <Link className={paid ? "primary-btn" : "secondary-btn"} href="/orders">
          مشاهده سفارش‌ها
        </Link>
        <Link className="text-link" href="/products">
          بازگشت به فروشگاه
        </Link>
      </div>
    </section>
  );
}
