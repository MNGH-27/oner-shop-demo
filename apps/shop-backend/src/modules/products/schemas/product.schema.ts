import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductSizeType {
  LETTER = 'letter',
  DIMENSION = 'dimension',
}

@Schema({ _id: false })
export class ProductColor {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  hex?: string;
}

export const ProductColorSchema = SchemaFactory.createForClass(ProductColor);

@Schema({ _id: false })
export class ProductSize {
  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ min: 0 })
  widthCm?: number;

  @Prop({ min: 0 })
  lengthCm?: number;
}

export const ProductSizeSchema = SchemaFactory.createForClass(ProductSize);

@Schema({ _id: false })
export class ProductVariant {
  @Prop({ trim: true })
  color?: string;

  @Prop({ trim: true })
  size?: string;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ type: Number, min: 0, default: null })
  lowStockThreshold?: number | null;

  @Prop({ default: false })
  lowStockNotified: boolean;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, default: '' })
  descriptionHtml?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  discountPercent: number;

  /** هزینه ارسال این کالا (تومان) */
  @Prop({ required: true, min: 0, default: 0 })
  shippingCost: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ type: [ProductColorSchema], default: [] })
  colors: ProductColor[];

  @Prop({ type: String, enum: ProductSizeType, default: ProductSizeType.LETTER })
  sizeType: ProductSizeType;

  @Prop({ type: [ProductSizeSchema], default: [] })
  sizes: ProductSize[];

  /** موجودی مستقل برای هر ترکیب رنگ و سایز */
  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  relatedProducts: Types.ObjectId[];

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
