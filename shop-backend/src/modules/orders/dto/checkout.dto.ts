import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/order.enum';

export class ShippingAddressDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(8)
  phone: string;

  @IsString()
  @MinLength(2)
  province: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(5)
  addressLine: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class CheckoutDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
