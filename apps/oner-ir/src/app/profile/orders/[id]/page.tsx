import { OrderDetails } from "@components/modules/orders/OrderDetails";

export const metadata = { title: "جزئیات سفارش" };

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetails orderId={id} />;
}
