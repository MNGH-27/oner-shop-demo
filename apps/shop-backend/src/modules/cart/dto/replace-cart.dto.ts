import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AddToCartDto } from './add-to-cart.dto';

export class ReplaceCartDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AddToCartDto)
  items: AddToCartDto[];
}
