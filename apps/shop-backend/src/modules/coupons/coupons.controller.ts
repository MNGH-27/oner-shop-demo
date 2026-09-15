import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { CouponsService } from './coupons.service';
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() dto: CouponDto) {
    return this.service.create(dto);
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CouponDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
@Controller('coupons')
export class CatalogCouponsController {
  constructor(private readonly service: CouponsService) {}
  @Post('validate') validate(@Body() dto: ValidateCouponDto) {
    return this.service.validate(dto.code, dto.amount);
  }
}
