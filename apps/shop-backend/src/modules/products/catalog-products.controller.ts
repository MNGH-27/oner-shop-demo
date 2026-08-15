import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Catalog - Products')
@Controller('products')
export class CatalogProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '24',
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
  ) {
    return this.productsService.findAll(Number(page), Number(limit), {
      category,
      search,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock === 'true' ? true : undefined,
      onlyActive: true,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findActiveById(id);
  }
}
