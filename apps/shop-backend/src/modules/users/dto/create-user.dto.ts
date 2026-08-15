import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/role.enum';

export class CreateUserDto {
  /** اختیاری — اگر خالی باشد از شماره همراه ساخته می‌شود */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود',
  })
  phone: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
