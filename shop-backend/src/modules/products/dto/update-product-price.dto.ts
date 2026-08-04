import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateProductPriceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}
