import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';

const orderTransitions: Record<string, readonly string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const paymentTransitions: Record<string, readonly string[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
  [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING, PaymentStatus.PAID],
  [PaymentStatus.REFUNDED]: [],
};

export function canTransitionOrder(current: string, next: string): boolean {
  return current === next || orderTransitions[current]?.includes(next) === true;
}

export function canTransitionPayment(current: string, next: string): boolean {
  return (
    current === next || paymentTransitions[current]?.includes(next) === true
  );
}
