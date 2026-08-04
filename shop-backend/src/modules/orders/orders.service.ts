import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/order.enum';
import { CartService } from '../cart/cart.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductsService } from '../products/products.service';
import { CheckoutDto } from './dto/checkout.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order.dto';
import { Order, OrderDocument, OrderItem } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
  ) {}

  private generateOrderNumber(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${stamp}-${rand}`;
  }

  async checkout(userId: string, dto: CheckoutDto): Promise<OrderDocument> {
    const cart = await this.cartService.getCartDocument(userId);

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await this.productModel.findById(item.product).exec();

      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Product ${item.product.toString()} is unavailable`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        );
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id as Types.ObjectId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images?.[0],
      });
    }

    const shippingCost = dto.shippingCost ?? 0;
    const totalAmount = subtotal + shippingCost;

    // Decrement stock before creating order
    for (const item of orderItems) {
      await this.productsService.adjustStock(
        item.product.toString(),
        -item.quantity,
      );
    }

    const order = await this.orderModel.create({
      orderNumber: this.generateOrderNumber(),
      user: new Types.ObjectId(userId),
      items: orderItems,
      status: OrderStatus.PENDING,
      shippingAddress: dto.shippingAddress,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY,
      subtotal,
      shippingCost,
      totalAmount,
      notes: dto.notes,
    });

    await this.cartService.clearCart(userId);

    /*
     * TODO(telegram-notify): ارسال نوتیف سفارش جدید به بات تلگرام ادمین
     * محل پیاده‌سازی: بعد از ثبت موفق سفارش (همین‌جا).
     * پیشنهاد: ماژول Notifications/TelegramService با BOT_TOKEN و ADMIN_CHAT_ID از env
     * پیام نمونه: شماره سفارش، مبلغ، نام مشتری، وضعیت پرداخت.
     * خطا در ارسال تلگرام نباید checkout را fail کند (fire-and-forget / try-catch).
     */

    return this.findById(order._id.toString());
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
    const query: Record<string, unknown> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters?.userId) query.user = filters.userId;
    if (filters?.search) {
      query.orderNumber = { $regex: filters.search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('user', 'email firstName lastName phone')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getStats() {
    const [byStatus, byPayment, revenue] = await Promise.all([
      this.orderModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<{ _id: null; total: number; count: number }>([
        {
          $match: {
            status: { $ne: OrderStatus.CANCELLED },
            paymentStatus: PaymentStatus.PAID,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts = Object.values(OrderStatus).reduce(
      (acc, status) => {
        acc[status] = byStatus.find((s) => s._id === status)?.count ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const paymentCounts = Object.values(PaymentStatus).reduce(
      (acc, status) => {
        acc[status] = byPayment.find((s) => s._id === status)?.count ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      byStatus: statusCounts,
      byPaymentStatus: paymentCounts,
      paidRevenue: revenue[0]?.total ?? 0,
      paidOrders: revenue[0]?.count ?? 0,
    };
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    return this.findAll(page, limit, { userId });
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'email firstName lastName phone')
      .exec();

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByIdForUser(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.findById(id);
    const ownerId =
      order.user instanceof Types.ObjectId
        ? order.user.toString()
        : (order.user as { _id: Types.ObjectId })._id.toString();

    if (ownerId !== userId) {
      throw new ForbiddenException('You cannot access this order');
    }
    return order;
  }

  async cancelByCustomer(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.findByIdForUser(id, userId);

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only pending or confirmed orders can be cancelled',
      );
    }

    return this.updateStatus(id, { status: OrderStatus.CANCELLED });
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled order cannot be updated');
    }

    const previousStatus = order.status;
    order.status = dto.status;

    if (dto.notes !== undefined) {
      order.notes = dto.notes;
    }

    if (dto.status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
      if (order.paymentStatus === PaymentStatus.PENDING) {
        order.paymentStatus = PaymentStatus.PAID;
      }
    } else if (previousStatus === OrderStatus.DELIVERED) {
      order.set('deliveredAt', null);
    }

    if (dto.status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      for (const item of order.items) {
        await this.productsService.adjustStock(
          item.product.toString(),
          item.quantity,
        );
      }
    }

    return order.save();
  }

  async updatePaymentStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<OrderDocument> {
    const order = await this.findById(id);
    order.paymentStatus = dto.paymentStatus;
    return order.save();
  }
}
