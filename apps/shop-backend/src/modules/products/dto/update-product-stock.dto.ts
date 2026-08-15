import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Set absolute stock quantity (and optional alert threshold) */
export class SetProductStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number | null;
}

export class ProductVariantStockDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number | null;
}

export class SetProductVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantStockDto)
  variants: ProductVariantStockDto[];
}
