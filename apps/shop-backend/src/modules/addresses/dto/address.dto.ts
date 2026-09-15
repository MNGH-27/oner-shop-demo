import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود',
  })
  phone: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد پستی باید دقیقاً ۱۰ رقم باشد' })
  postalCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
