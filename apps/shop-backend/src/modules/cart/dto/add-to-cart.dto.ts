import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;
}
