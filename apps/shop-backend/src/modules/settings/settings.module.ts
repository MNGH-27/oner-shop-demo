import { Module } from '@nestjs/common';
import {
  SettingsController,
  StoreSettingsController,
} from './settings.controller';
import { SettingsService } from './settings.service';
@Module({
  controllers: [SettingsController, StoreSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
