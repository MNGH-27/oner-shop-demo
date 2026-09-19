import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PaymentAttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  static readonly lifetimeMs = 20 * 60 * 1000;
  private readonly logger = new Logger(ReservationsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.releaseExpired();
    this.timer = setInterval(() => void this.releaseExpired(), 30_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  expiresAt(now = new Date()) {
    return new Date(now.getTime() + ReservationsService.lifetimeMs);
  }

  async releaseOrder(orderId: string, onlyIfExpired = true): Promise<boolean> {
    const now = new Date();
    return this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.order.updateMany({
          where: {
            id: orderId,
            reservationStatus: 'reserved',
            ...(onlyIfExpired
              ? { reservationExpiresAt: { lte: now } }
              : {}),
          },
          data: {
            reservationStatus: 'released',
            reservationExpiresAt: null,
            status: 'cancelled',
            paymentStatus: 'failed',
            cancelledAt: now,
          },
        });
        if (!claimed.count) return false;

        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { variants: true },
          });
          if (!product) continue;
          const variant = product.variants.find(
            (row) =>
              row.color === (item.color ?? '') &&
              row.size === (item.size ?? ''),
          );
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { increment: item.quantity } },
            });
          }
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.paymentAttempt.updateMany({
          where: { orderId, status: PaymentAttemptStatus.pending },
          data: { status: PaymentAttemptStatus.cancelled },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async releaseExpired() {
    try {
      const rows = await this.prisma.order.findMany({
        where: {
          reservationStatus: 'reserved',
          reservationExpiresAt: { lte: new Date() },
        },
        select: { id: true },
        take: 100,
      });
      const results = await Promise.all(
        rows.map((row) => this.releaseOrder(row.id, true)),
      );
      const released = results.filter(Boolean).length;
      if (released) this.logger.log(`Released ${released} expired order(s)`);
      return released;
    } catch (error) {
      this.logger.error('Failed to release expired reservations', error);
      return 0;
    }
  }
}
