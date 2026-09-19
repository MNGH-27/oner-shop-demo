import { PrismaService } from '../../database/prisma.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  it('creates an exact twenty-minute payment window', () => {
    const service = new ReservationsService({} as PrismaService);
    const now = new Date('2026-09-19T12:00:00.000Z');

    expect(service.expiresAt(now).toISOString()).toBe(
      '2026-09-19T12:20:00.000Z',
    );
  });

  it('claims an expired reservation before restoring its inventory', async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            productId: 'product-1',
            quantity: 2,
            color: 'کرم',
            size: 'بزرگ',
          },
        ]),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'product-1',
          variants: [{ id: 'variant-1', color: 'کرم', size: 'بزرگ' }],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      productVariant: { update: jest.fn().mockResolvedValue({}) },
      paymentAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new ReservationsService(prisma);

    await expect(service.releaseOrder('order-1', true)).resolves.toBe(true);
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'order-1',
          reservationStatus: 'reserved',
          reservationExpiresAt: { lte: expect.any(Date) },
        }),
      }),
    );
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stock: { increment: 2 } },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stock: { increment: 2 } },
    });
  });

  it('does not restore inventory when another worker claimed the order', async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      orderItem: { findMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new ReservationsService(prisma);

    await expect(service.releaseOrder('order-1', true)).resolves.toBe(false);
    expect(tx.orderItem.findMany).not.toHaveBeenCalled();
  });
});
