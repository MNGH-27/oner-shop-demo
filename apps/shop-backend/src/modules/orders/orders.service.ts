import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus as DbOrderStatus,
  PaymentStatus as DbPaymentStatus,
  Prisma,
} from '@prisma/client';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { apiEntity } from '../../common/utils/api-entity';
import { couponDiscount, discountedPrice } from '../../common/utils/pricing';
import { PrismaService } from '../../database/prisma.service';
import { ProductsService } from '../products/products.service';
import { SettingsService } from '../settings/settings.service';
import { CheckoutDto } from './dto/checkout.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order.dto';
import { canTransitionOrder, canTransitionPayment } from './order-transitions';
const includeOrder = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  items: true,
} as const;
type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof includeOrder;
}>;
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
  ) {}

  private isWriteConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2034'
    );
  }

  private async serializableTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maximumAttempts = 3;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (attempt === maximumAttempts || !this.isWriteConflict(error)) {
          throw error;
        }
      }
    }
    throw new Error('Transaction retry limit reached');
  }

  private async decreaseStock(
    tx: Prisma.TransactionClient,
    item: {
      quantity: number;
      color: string;
      size: string;
      product: {
        id: string;
        categoryId: string;
        name: string;
        isActive: boolean;
        stock: number;
        variants: Array<{
          id: string;
          color: string;
          size: string;
          stock: number;
        }>;
      };
    },
  ): Promise<void> {
    const { product, quantity } = item;
    if (!product.isActive) {
      throw new BadRequestException(`Product ${product.id} is unavailable`);
    }
    const visited = new Set<string>();
    let categoryId: string | null = product.categoryId;
    while (categoryId) {
      if (visited.has(categoryId)) {
        throw new BadRequestException(`Product ${product.id} is unavailable`);
      }
      visited.add(categoryId);
      const category: { parentId: string | null; isActive: boolean } | null =
        await tx.category.findUnique({
          where: { id: categoryId },
          select: { parentId: true, isActive: true },
        });
      if (!category?.isActive) {
        throw new BadRequestException(`Product ${product.id} is unavailable`);
      }
      categoryId = category.parentId;
    }

    const variant = product.variants.length
      ? product.variants.find(
          (row) => row.color === item.color && row.size === item.size,
        )
      : undefined;
    if (product.variants.length && !variant) {
      throw new BadRequestException(
        `Selected variant for "${product.name}" is unavailable`,
      );
    }

    if (variant) {
      const variantUpdate = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (!variantUpdate.count) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${variant.stock}`,
        );
      }
    }

    const productUpdate = await tx.product.updateMany({
      where: {
        id: product.id,
        isActive: true,
        stock: { gte: quantity },
      },
      data: { stock: { decrement: quantity } },
    });
    if (!productUpdate.count) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}`,
      );
    }
  }

  private async restoreStock(
    tx: Prisma.TransactionClient,
    item: {
      productId: string;
      quantity: number;
      color: string | null;
      size: string | null;
    },
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.variants.length) {
      const variant = product.variants.find(
        (row) =>
          row.color === (item.color ?? '') && row.size === (item.size ?? ''),
      );
      if (!variant) {
        throw new BadRequestException(
          `The ordered variant for "${product.name}" no longer exists`,
        );
      }
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
  private number() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  private map(row: OrderWithDetails) {
    return {
      ...apiEntity(row),
      user: apiEntity(row.user),
      items: row.items.map((i) => ({
        ...apiEntity(i),
        product: i.productId,
      })),
    };
  }
  async checkout(userId: string, dto: CheckoutDto) {
    if (Boolean(dto.addressId) === Boolean(dto.shippingAddress)) {
      throw new BadRequestException(
        'یکی از نشانی‌های ذخیره‌شده یا یک نشانی جدید را انتخاب کنید',
      );
    }

    const shippingCost = await this.settings.getShippingCost();
    const result = await this.serializableTransaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: { include: { product: { include: { variants: true } } } },
        },
      });
      if (!cart?.items.length) {
        throw new BadRequestException('Cart is empty');
      }

      let subtotal = 0;
      for (const item of cart.items) {
        await this.decreaseStock(tx, item);
        subtotal +=
          discountedPrice(item.product.price, item.product.discountPercent) *
          item.quantity;
      }

      let appliedCouponCode: string | null = null;
      let appliedCouponDiscount = 0;
      if (dto.couponCode?.trim()) {
        const normalizedCode = dto.couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({
          where: { code: normalizedCode },
        });
        if (!coupon || !coupon.isActive || coupon.expiresAt <= new Date()) {
          throw new BadRequestException('کد تخفیف معتبر نیست');
        }
        if (subtotal < coupon.minimumAmount) {
          throw new BadRequestException('مبلغ خرید کمتر از حداقل این کد است');
        }
        appliedCouponCode = coupon.code;
        appliedCouponDiscount = couponDiscount(
          subtotal,
          coupon.percent,
          coupon.maximumDiscountAmount,
        );
      }

      let selectedAddress;
      if (dto.addressId) {
        selectedAddress = await tx.address.findFirst({
          where: { id: dto.addressId, userId },
        });
        if (!selectedAddress) {
          throw new BadRequestException('نشانی انتخاب‌شده معتبر نیست');
        }
      } else {
        const input = dto.shippingAddress!;
        const existingAddressCount = await tx.address.count({
          where: { userId },
        });
        const isDefault =
          existingAddressCount === 0 || input.isDefault === true;
        if (isDefault) {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }
        selectedAddress = await tx.address.create({
          data: {
            title: input.title.trim(),
            fullName: input.fullName.trim(),
            phone: input.phone.trim(),
            province: input.province.trim(),
            city: input.city.trim(),
            addressLine: input.addressLine.trim(),
            postalCode: input.postalCode.trim(),
            isDefault,
            userId,
          },
        });
      }

      const shippingAddress = {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        province: selectedAddress.province,
        city: selectedAddress.city,
        addressLine: selectedAddress.addressLine,
        postalCode: selectedAddress.postalCode,
      };
      const order = await tx.order.create({
        data: {
          orderNumber: this.number(),
          userId,
          status: 'pending',
          shippingAddress: shippingAddress as Prisma.InputJsonValue,
          paymentStatus: 'pending',
          paymentMethod: 'online',
          subtotal,
          shippingCost,
          couponCode: appliedCouponCode,
          couponDiscount: appliedCouponDiscount,
          totalAmount: subtotal - appliedCouponDiscount + shippingCost,
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              price: discountedPrice(
                item.product.price,
                item.product.discountPercent,
              ),
              quantity: item.quantity,
              image: item.product.images[0],
              color: item.color || undefined,
              size: item.size || undefined,
            })),
          },
        },
        include: includeOrder,
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return {
        order,
        productIds: [...new Set(cart.items.map((item) => item.productId))],
      };
    });

    await Promise.allSettled(
      result.productIds.map((id) => this.products.checkLowStock(id)),
    );
    return this.map(result.order);
  }
  private where(filters?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    userId?: string;
    search?: string;
  }): Prisma.OrderWhereInput {
    return {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.search
        ? { orderNumber: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
  }
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      userId?: string;
      search?: string;
    },
  ) {
    const where = this.where(filters);
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: includeOrder,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.map(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
  async getStats() {
    const [statuses, payments, revenue, totalOrders] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.groupBy({ by: ['paymentStatus'], _count: true }),
      this.prisma.order.aggregate({
        where: { status: { not: 'cancelled' }, paymentStatus: 'paid' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.count(),
    ]);
    const byStatus = Object.fromEntries(
      Object.values(OrderStatus).map((s) => [
        s,
        statuses.find((x) => x.status === String(s))?._count ?? 0,
      ]),
    );
    const byPaymentStatus = Object.fromEntries(
      Object.values(PaymentStatus).map((s) => [
        s,
        payments.find((x) => x.paymentStatus === String(s))?._count ?? 0,
      ]),
    );
    return {
      totalOrders,
      byStatus,
      byPaymentStatus,
      paidRevenue: revenue._sum.totalAmount ?? 0,
      paidOrders: revenue._count,
    };
  }
  findByUser(userId: string, page = 1, limit = 20) {
    return this.findAll(page, limit, { userId });
  }
  async findById(id: string) {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: includeOrder,
    });
    if (!row) throw new NotFoundException('Order not found');
    return this.map(row);
  }
  async findByIdForUser(id: string, userId: string) {
    const row = await this.findById(id);
    if (row.user.id !== userId)
      throw new ForbiddenException('You cannot access this order');
    return row;
  }
  async cancelByCustomer(id: string, userId: string) {
    return this.updateStatus(id, { status: OrderStatus.CANCELLED }, userId);
  }
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    customerId?: string,
  ) {
    const result = await this.serializableTransaction(async (tx) => {
      const row = await tx.order.findUnique({
        where: { id },
        include: includeOrder,
      });
      if (!row) throw new NotFoundException('Order not found');
      if (customerId && row.userId !== customerId) {
        throw new ForbiddenException('You cannot access this order');
      }
      if (row.status === DbOrderStatus.cancelled) {
        throw new BadRequestException('Cancelled order cannot be updated');
      }
      if (
        customerId &&
        ![DbOrderStatus.pending, DbOrderStatus.confirmed].some(
          (status) => status === row.status,
        )
      ) {
        throw new BadRequestException(
          'Only pending or confirmed orders can be cancelled',
        );
      }
      if (!canTransitionOrder(row.status, dto.status)) {
        throw new BadRequestException(
          `Order cannot move from ${row.status} to ${dto.status}`,
        );
      }

      if (
        dto.status === OrderStatus.CANCELLED &&
        row.paymentStatus === DbPaymentStatus.paid
      ) {
        throw new BadRequestException(
          'سفارش پرداخت‌شده باید پس از بازگشت وجه لغو شود',
        );
      }

      if (dto.status === OrderStatus.CANCELLED) {
        for (const item of row.items) await this.restoreStock(tx, item);
      }

      const order = await tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes,
          deliveredAt:
            dto.status === OrderStatus.DELIVERED
              ? new Date()
              : row.status === DbOrderStatus.delivered
                ? null
                : undefined,
          cancelledAt:
            dto.status === OrderStatus.CANCELLED ? new Date() : undefined,
        },
        include: includeOrder,
      });
      return {
        order,
        restockedProductIds:
          dto.status === OrderStatus.CANCELLED
            ? [...new Set(row.items.map((item) => item.productId))]
            : [],
      };
    });

    await Promise.allSettled(
      result.restockedProductIds.map((productId) =>
        this.products.checkLowStock(productId),
      ),
    );
    return this.map(result.order);
  }
  async updatePaymentStatus(id: string, dto: UpdatePaymentStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!canTransitionPayment(order.paymentStatus, dto.paymentStatus)) {
      throw new BadRequestException(
        `Payment cannot move from ${order.paymentStatus} to ${dto.paymentStatus}`,
      );
    }
    if (
      order.status === DbOrderStatus.cancelled &&
      dto.paymentStatus !== PaymentStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Cancelled order payment can only be refunded',
      );
    }
    await this.prisma.order.update({
      where: { id },
      data: { paymentStatus: dto.paymentStatus },
    });
    return this.findById(id);
  }
}
