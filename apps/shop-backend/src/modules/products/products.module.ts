import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { CatalogProductsController } from './catalog-products.controller';
import { ProductsService } from './products.service';
@Module({
  controllers: [ProductsController, CatalogProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
