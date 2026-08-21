import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { ProductsController } from './products.controller';
import { CatalogProductsController } from './catalog-products.controller';
import { ProductsService } from './products.service';
@Module({ imports: [SettingsModule], controllers: [ProductsController, CatalogProductsController], providers: [ProductsService], exports: [ProductsService] })
export class ProductsModule {}
