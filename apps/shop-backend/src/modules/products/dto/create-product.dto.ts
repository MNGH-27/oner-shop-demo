import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
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
import { ProductSizeType } from '../schemas/product.schema';

export class ProductColorDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  hex?: string;
}

export class ProductSizeDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lengthCm?: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  /** Optional on create — use PATCH /:id/price to set later */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  discountPercent?: number;

  /** اگر خالی باشد از هزینه ارسال پیش‌فرض فروشگاه استفاده می‌شود */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsMongoId()
  category: string;

  /** Optional on create — use PATCH /:id/stock to set later */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

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

  /** آستانه اعلان موجودی کم در تلگرام — null/خالی = غیرفعال */
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
  @IsMongoId({ each: true })
  relatedProducts?: string[];
}
