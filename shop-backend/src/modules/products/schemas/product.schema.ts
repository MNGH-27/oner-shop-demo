import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  /** هزینه ارسال این کالا (تومان) */
  @Prop({ required: true, min: 0, default: 0 })
  shippingCost: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  /**
   * وقتی موجودی به این عدد برسد (یا کمتر شود)، اعلان تلگرام ارسال می‌شود.
   * خالی = بدون اعلان.
   */
  @Prop({ type: Number, min: 0, default: null })
  lowStockThreshold?: number | null;

  /** جلوگیری از نوتیف تکراری تا وقتی موجودی دوباره بالای آستانه برود */
  @Prop({ default: false })
  lowStockNotified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  attributes: Record<string, string | number | boolean>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
