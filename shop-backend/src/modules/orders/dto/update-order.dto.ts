import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  OrderStatus,
  PaymentStatus,
} from '../../../common/enums/order.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}
