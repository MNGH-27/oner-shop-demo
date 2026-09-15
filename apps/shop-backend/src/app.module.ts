import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { validateEnvironment } from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { BannersModule } from './modules/banners/banners.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { SeedModule } from './modules/seed/seed.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SmsModule } from './modules/sms/sms.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './database/prisma.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AddressesModule,
    SmsModule,
    TelegramModule,
    UsersModule,
    AuthModule,
    BannersModule,
    CategoriesModule,
    CouponsModule,
    EngagementModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    UploadsModule,
    SettingsModule,
    SeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
