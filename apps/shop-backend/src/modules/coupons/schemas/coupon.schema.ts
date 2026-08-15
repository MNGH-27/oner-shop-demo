import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type CouponDocument = HydratedDocument<Coupon>;
@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) code: string;
  @Prop({ required: true, min: 1, max: 100 }) percent: number;
  @Prop({ min: 0, default: 0 }) minimumAmount: number;
  @Prop({ required: true, min: 1 }) maximumDiscountAmount: number;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ type: Date, required: true }) expiresAt: Date;
}
export const CouponSchema = SchemaFactory.createForClass(Coupon);
