import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatus } from '../../common/enums/order.enum';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

class CustomerOrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

@ApiTags('Customer - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: CustomerOrderQueryDto,
  ) {
    return this.ordersService.findAll(query.page, query.limit, {
      userId,
      status: query.status,
    });
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findByIdForUser(id, userId);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.cancelByCustomer(id, userId);
  }
}
