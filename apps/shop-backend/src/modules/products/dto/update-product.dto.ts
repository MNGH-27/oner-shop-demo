import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  ValidateIf,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { ProductColorDto, ProductSizeDto } from './create-product.dto';
import { ProductSizeType } from '../product.types';
import { ProductVariantStockDto } from './update-product-stock.dto';

/** General product update — price & stock have dedicated routes */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsUUID()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];

  @IsOptional()
  @IsEnum(ProductSizeType)
  sizeType?: ProductSizeType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSizeDto)
  sizes?: ProductSizeDto[];

  /** آستانه اعلان موجودی کم در تلگرام — null برای غیرفعال کردن */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number | boolean>;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  relatedProducts?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantStockDto)
  variants?: ProductVariantStockDto[];
}
