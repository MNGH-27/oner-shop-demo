import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingDocument = HydratedDocument<Setting>;

@Schema({ timestamps: true, collection: 'settings' })
export class Setting {
  @Prop({ required: true, unique: true, default: 'shop' })
  key: string;

  /** هزینه ارسال پیش‌فرض فروشگاه (تومان) — هنگام ساخت محصول اعمال می‌شود */
  @Prop({ required: true, min: 0, default: 50000 })
  defaultShippingCost: number;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
