import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Catalog - Categories')
@Controller('categories')
export class CatalogCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll(1, 100, { onlyActive: true });
  }

  @Get('tree')
  tree() {
    return this.categoriesService.getTree(true);
  }
}
