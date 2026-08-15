import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type BannerDocument = HydratedDocument<Banner>;
@Schema({ timestamps: true, collection: 'banners' })
export class Banner {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ trim: true }) subtitle?: string;
  @Prop({ required: true, trim: true }) image: string;
  @Prop({ default: true }) isActive: boolean;
}
export const BannerSchema = SchemaFactory.createForClass(Banner);
