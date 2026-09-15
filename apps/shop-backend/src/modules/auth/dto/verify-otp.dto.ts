import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود',
  })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'کد تأیید باید ۶ رقم باشد' })
  code: string;
}
