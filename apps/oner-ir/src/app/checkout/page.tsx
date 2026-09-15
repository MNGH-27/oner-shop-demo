import { CheckoutForm } from "@components/modules/checkout/CheckoutForm";

export const metadata = { title: "ثبت سفارش" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const { coupon } = await searchParams;
  return (
    <div className="checkout-page">
      <header className="page-hero">
        <span className="eyebrow">مرحله نهایی خرید</span>
        <h1>انتخاب نشانی و پرداخت</h1>
        <p>یک نشانی ذخیره‌شده را انتخاب کنید یا نشانی تازه‌ای بسازید.</p>
      </header>
      <CheckoutForm initialCoupon={coupon?.slice(0, 64)} />
    </div>
  );
}
