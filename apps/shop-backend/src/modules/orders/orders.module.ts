import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PaymentsModule } from '../payments/payments.module';
import { SettingsModule } from '../settings/settings.module';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
@Module({
  imports: [ProductsModule, PaymentsModule, SettingsModule],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
