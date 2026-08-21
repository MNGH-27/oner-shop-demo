import { Module } from '@nestjs/common';
import { CouponsController, CatalogCouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
@Module({ controllers: [CouponsController, CatalogCouponsController], providers: [CouponsService] })
export class CouponsModule {}
