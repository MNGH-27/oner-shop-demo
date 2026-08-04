import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class SetUserActiveDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
