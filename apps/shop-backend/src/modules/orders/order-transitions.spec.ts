import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { canTransitionOrder, canTransitionPayment } from './order-transitions';

describe('order transitions', () => {
  it('permits the normal fulfilment path', () => {
    expect(
      canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.PROCESSING),
    ).toBe(true);
    expect(canTransitionOrder(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(
      true,
    );
  });

  it('does not reopen a delivered or cancelled order', () => {
    expect(
      canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.PROCESSING),
    ).toBe(false);
    expect(canTransitionOrder(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(
      false,
    );
  });
});

describe('payment transitions', () => {
  it('only refunds a paid order', () => {
    expect(
      canTransitionPayment(PaymentStatus.PAID, PaymentStatus.REFUNDED),
    ).toBe(true);
    expect(
      canTransitionPayment(PaymentStatus.PENDING, PaymentStatus.REFUNDED),
    ).toBe(false);
  });
});
