import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CatalogCategoriesController } from './catalog-categories.controller';
import { CategoriesService } from './categories.service';
@Module({
  controllers: [CategoriesController, CatalogCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
