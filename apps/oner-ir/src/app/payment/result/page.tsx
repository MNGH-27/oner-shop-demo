import { PaymentResult } from "@components/modules/payment/PaymentResult";

export const metadata = { title: "نتیجه پرداخت" };

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; result?: string }>;
}) {
  const { orderId = "", result = "" } = await searchParams;
  return (
    <div className="payment-result-page">
      <PaymentResult
        orderId={orderId.slice(0, 64)}
        callbackResult={result.slice(0, 16)}
      />
    </div>
  );
}
