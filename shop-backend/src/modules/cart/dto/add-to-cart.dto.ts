import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
