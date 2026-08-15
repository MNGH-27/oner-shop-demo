import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
export class CouponDto { @IsString() code: string; @Type(() => Number) @IsNumber() @Min(1) @Max(100) percent: number; @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumAmount?: number; @Type(() => Number) @IsNumber() @Min(1) maximumDiscountAmount: number; @IsOptional() @IsBoolean() isActive?: boolean; @IsDateString() expiresAt: string }
export class ValidateCouponDto { @IsString() code: string; @Type(() => Number) @IsNumber() @Min(0) amount: number }
