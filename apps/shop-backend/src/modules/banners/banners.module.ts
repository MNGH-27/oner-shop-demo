import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannersController, CatalogBannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { Banner, BannerSchema } from './schemas/banner.schema';
@Module({ imports: [MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }])], controllers: [BannersController, CatalogBannersController], providers: [BannersService] })
export class BannersModule {}
