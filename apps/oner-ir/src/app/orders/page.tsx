import { OrdersList } from "@components/modules/orders/OrdersList";

export const metadata = { title: "سفارش‌های من" };

export default function OrdersPage() {
  return (
    <div className="orders-page">
      <header className="page-hero">
        <span className="eyebrow">حساب Oner</span>
        <h1>سفارش‌های من</h1>
        <p>وضعیت و جزئیات سفارش‌های ثبت‌شده را اینجا ببینید.</p>
      </header>
      <OrdersList />
    </div>
  );
}
