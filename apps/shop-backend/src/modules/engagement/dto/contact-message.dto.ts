import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^09\d{9}$/)
  phone: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message: string;
}
