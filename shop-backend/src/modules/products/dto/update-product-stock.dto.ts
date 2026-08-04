import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

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
