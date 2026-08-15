import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class CreateBannerDto {
  @IsString() title: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsString() image: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
