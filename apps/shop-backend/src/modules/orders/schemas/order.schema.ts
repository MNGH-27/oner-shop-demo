import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums/order.enum';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ trim: true })
  image?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop({ trim: true })
  size?: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  province: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  addressLine: string;

  @Prop({ trim: true })
  postalCode?: string;
}

export const ShippingAddressSchema =
  SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
  })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  shippingCost: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
