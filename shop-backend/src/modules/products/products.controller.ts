import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { SetProductStockDto } from './dto/update-product-stock.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyActive?: boolean;
}

@ApiTags('Admin - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create product (price/stock optional)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query.page, query.limit, {
      category: query.category,
      search: query.search,
      onlyActive: query.onlyActive,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product info (not price/stock)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/price')
  @ApiOperation({ summary: 'Set product price' })
  updatePrice(@Param('id') id: string, @Body() dto: UpdateProductPriceDto) {
    return this.productsService.updatePrice(id, dto.price);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Set absolute stock quantity and optional alert threshold' })
  setStock(@Param('id') id: string, @Body() dto: SetProductStockDto) {
    return this.productsService.setStock(
      id,
      dto.stock,
      dto.lowStockThreshold,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
