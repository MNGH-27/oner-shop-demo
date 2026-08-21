import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
@Module({ imports:[ProductsModule,CartModule],controllers:[OrdersController,CustomerOrdersController],providers:[OrdersService],exports:[OrdersService] })
export class OrdersModule {}
