import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentAttemptStatus,
  PaymentStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import ZarinPal from 'zarinpal-node-sdk';
import { PrismaService } from '../../database/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';

type PaymentResult = {
  orderId: string;
  result: 'success' | 'failed';
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reservations: ReservationsService,
  ) {}

  private get provider() {
    return this.config.get<string>('payment.provider') ?? 'mock';
  }

  private get callbackBaseUrl() {
    return (
      this.config.get<string>('payment.callbackBaseUrl') ??
      'http://127.0.0.1:5000'
    );
  }

  private get storefrontUrl() {
    return (
      this.config.get<string>('payment.storefrontUrl') ??
      'http://localhost:3000'
    );
  }

  private zarinpal() {
    return new ZarinPal({
      merchantId: this.config.get<string>('payment.zarinpalMerchantId'),
      sandbox: this.config.get<boolean>('payment.zarinpalSandbox') ?? false,
    });
  }

  private resultUrl({ orderId, result }: PaymentResult) {
    const url = new URL('/payment/result', this.storefrontUrl);
    url.searchParams.set('orderId', orderId);
    url.searchParams.set('result', result);
    return url.toString();
  }

  private gatewayUrl(gateway: string, authority: string) {
    if (gateway === 'mock') {
      return `${this.callbackBaseUrl}/api/payments/mock/${encodeURIComponent(authority)}`;
    }
    return this.zarinpal().payments.getRedirectUrl(authority);
  }

  private errorCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object' || !('response' in error)) {
      return undefined;
    }
    const response = error.response;
    if (!response || typeof response !== 'object' || !('data' in response)) {
      return undefined;
    }
    const payload = response.data;
    if (!payload || typeof payload !== 'object') return undefined;
    const errors = 'errors' in payload ? payload.errors : undefined;
    if (!errors || typeof errors !== 'object' || !('code' in errors)) {
      return undefined;
    }
    const code = Number(errors.code);
    return Number.isInteger(code) ? code : undefined;
  }

  async startForOrder(userId: string, orderId: string) {
    const expired = await this.reservations.releaseOrder(orderId, true);
    if (expired) {
      throw new BadRequestException(
        'مهلت ۲۰ دقیقه‌ای پرداخت تمام شده است؛ لطفاً کالاها را دوباره انتخاب کنید',
      );
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: { select: { email: true, phone: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (order.status === OrderStatus.cancelled) {
      throw new BadRequestException(
        order.reservationStatus === 'released'
          ? 'مهلت پرداخت تمام شده است؛ لطفاً کالاها را دوباره انتخاب کنید'
          : 'سفارش لغوشده قابل پرداخت نیست',
      );
    }
    if (order.paymentStatus === PaymentStatus.paid) {
      return { paymentUrl: this.resultUrl({ orderId, result: 'success' }) };
    }

    const latest = order.payments[0];
    if (latest?.status === PaymentAttemptStatus.pending) {
      return {
        paymentUrl: this.gatewayUrl(latest.gateway, latest.authority),
      };
    }

    if (order.totalAmount <= 0) {
      const committed = await this.prisma.order.updateMany({
        where: {
          id: order.id,
          reservationStatus: 'reserved',
          reservationExpiresAt: { gt: new Date() },
        },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          reservationStatus: 'committed',
          reservationExpiresAt: null,
        },
      });
      if (!committed.count) {
        await this.reservations.releaseOrder(order.id, true);
        throw new BadRequestException('مهلت پرداخت تمام شده است');
      }
      return { paymentUrl: this.resultUrl({ orderId, result: 'success' }) };
    }

    const amountRials = order.totalAmount * 10;
    if (!Number.isSafeInteger(amountRials) || amountRials < 1000) {
      throw new BadRequestException('مبلغ سفارش برای پرداخت معتبر نیست');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'pending' },
    });

    try {
      let authority: string;
      if (this.provider === 'mock') {
        authority = `MOCK-${randomUUID()}`;
      } else {
        const response = await this.zarinpal().payments.create({
          amount: amountRials,
          callback_url: `${this.callbackBaseUrl}/api/payments/zarinpal/callback`,
          description: `پرداخت سفارش ${order.orderNumber}`,
          mobile: order.user.phone ?? undefined,
          email: order.user.email,
        });
        if (
          Number(response?.data?.code) !== 100 ||
          !response?.data?.authority
        ) {
          throw new Error('ZarinPal did not return a payment authority');
        }
        authority = String(response.data.authority);
      }

      await this.prisma.paymentAttempt.create({
        data: {
          orderId: order.id,
          gateway: this.provider,
          authority,
          amountRials: BigInt(amountRials),
        },
      });
      return { paymentUrl: this.gatewayUrl(this.provider, authority) };
    } catch (error) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'failed' },
      });
      throw new BadGatewayException({
        message: 'اتصال به درگاه پرداخت انجام نشد؛ دوباره تلاش کنید',
        gatewayCode: this.errorCode(error),
      });
    }
  }

  private async markFailed(authority: string, status: PaymentAttemptStatus) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority },
      include: { order: true },
    });
    if (!attempt) throw new NotFoundException('تراکنش پیدا نشد');
    if (attempt.status === PaymentAttemptStatus.paid) {
      return { orderId: attempt.orderId, result: 'success' as const };
    }
    await this.prisma.$transaction([
      this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status },
      }),
      this.prisma.order.update({
        where: { id: attempt.orderId },
        data:
          attempt.order.paymentStatus === PaymentStatus.paid
            ? {}
            : { paymentStatus: 'failed' },
      }),
    ]);
    return { orderId: attempt.orderId, result: 'failed' as const };
  }

  private async markPaid(
    authority: string,
    details?: { referenceId?: string; cardPan?: string; feeRials?: bigint },
  ) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority },
      include: { order: true },
    });
    if (!attempt) throw new NotFoundException('تراکنش پیدا نشد');
    if (attempt.status === PaymentAttemptStatus.paid) {
      return { orderId: attempt.orderId, result: 'success' as const };
    }
    if (attempt.order.status === OrderStatus.cancelled) {
      throw new ForbiddenException('سفارش لغو شده است');
    }

    const committed = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: attempt.orderId,
          reservationStatus: 'reserved',
          reservationExpiresAt: { gt: new Date() },
          status: { not: OrderStatus.cancelled },
        },
        data: {
          paymentStatus: 'paid',
          status: OrderStatus.confirmed,
          reservationStatus: 'committed',
          reservationExpiresAt: null,
        },
      });
      if (!claimed.count) return false;
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'paid',
          referenceId: details?.referenceId,
          cardPan: details?.cardPan,
          feeRials: details?.feeRials,
          verifiedAt: new Date(),
        },
      });
      return true;
    });
    if (!committed) {
      await this.reservations.releaseOrder(attempt.orderId, true);
      throw new ForbiddenException(
        'مهلت ۲۰ دقیقه‌ای پرداخت تمام شده است',
      );
    }
    return { orderId: attempt.orderId, result: 'success' as const };
  }

  async handleZarinpalCallback(authority: string, status: string) {
    if (!authority) throw new BadRequestException('شناسه تراکنش نامعتبر است');
    if (status.toUpperCase() !== 'OK') {
      return this.markFailed(authority, PaymentAttemptStatus.cancelled);
    }

    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority },
    });
    if (!attempt || attempt.gateway !== 'zarinpal') {
      throw new NotFoundException('تراکنش پیدا نشد');
    }
    if (attempt.status === PaymentAttemptStatus.paid) {
      return { orderId: attempt.orderId, result: 'success' as const };
    }

    try {
      const response = await this.zarinpal().verifications.verify({
        amount: Number(attempt.amountRials),
        authority,
      });
      const code = Number(response?.data?.code);
      if (![100, 101].includes(code)) {
        await this.prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'failed',
            errorCode: Number.isInteger(code) ? code : undefined,
          },
        });
        return this.markFailed(authority, PaymentAttemptStatus.failed);
      }
      return this.markPaid(authority, {
        referenceId:
          response?.data?.ref_id === undefined
            ? undefined
            : String(response.data.ref_id),
        cardPan: response?.data?.card_pan
          ? String(response.data.card_pan)
          : undefined,
        feeRials:
          response?.data?.fee === undefined
            ? undefined
            : BigInt(response.data.fee),
      });
    } catch (error) {
      const code = this.errorCode(error);
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'failed', errorCode: code },
      });
      return this.markFailed(authority, PaymentAttemptStatus.failed);
    }
  }

  async getMockPayment(authority: string) {
    if (this.provider !== 'mock') {
      throw new NotFoundException('صفحه پرداخت آزمایشی فعال نیست');
    }
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority },
      include: { order: true },
    });
    if (!attempt || attempt.gateway !== 'mock') {
      throw new NotFoundException('تراکنش آزمایشی پیدا نشد');
    }
    return attempt;
  }

  async completeMock(authority: string, result: string) {
    await this.getMockPayment(authority);
    if (result === 'success')
      return this.markPaid(authority, { referenceId: `DEV-${Date.now()}` });
    return this.markFailed(authority, PaymentAttemptStatus.cancelled);
  }

  redirectFor(result: PaymentResult) {
    return this.resultUrl(result);
  }

  failedRedirectFor(orderId: string) {
    return this.resultUrl({ orderId, result: 'failed' });
  }
}
