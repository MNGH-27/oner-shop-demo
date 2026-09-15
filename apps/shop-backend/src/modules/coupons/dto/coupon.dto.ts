import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
export class CouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/i)
  code: string;
  @Type(() => Number) @IsNumber() @Min(1) @Max(100) percent: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumAmount?: number;
  @Type(() => Number) @IsNumber() @Min(1) maximumDiscountAmount: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsDateString() expiresAt: string;
}
export class ValidateCouponDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code: string;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
}
