import { Module } from '@nestjs/common';
import {
  BannersController,
  CatalogBannersController,
} from './banners.controller';
import { BannersService } from './banners.service';
@Module({
  controllers: [BannersController, CatalogBannersController],
  providers: [BannersService],
})
export class BannersModule {}
