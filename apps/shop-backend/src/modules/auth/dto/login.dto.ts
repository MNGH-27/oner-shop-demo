import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^09\d{9}$/) phone?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
