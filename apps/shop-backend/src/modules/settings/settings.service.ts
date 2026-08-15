import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Setting, SettingDocument } from './schemas/setting.schema';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<SettingDocument>,
  ) {}

  async onModuleInit() {
    await this.getOrCreate();
  }

  async getOrCreate(): Promise<SettingDocument> {
    let settings = await this.settingModel.findOne({ key: 'shop' }).exec();
    if (!settings) {
      settings = await this.settingModel.create({
        key: 'shop',
        defaultShippingCost: 50000,
      });
    }
    return settings;
  }

  async get() {
    const settings = await this.getOrCreate();
    return {
      defaultShippingCost: settings.defaultShippingCost,
    };
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.settingModel
      .findOneAndUpdate(
        { key: 'shop' },
        { defaultShippingCost: dto.defaultShippingCost },
        { new: true, upsert: true },
      )
      .exec();

    return {
      defaultShippingCost: settings!.defaultShippingCost,
    };
  }

  async getDefaultShippingCost(): Promise<number> {
    const settings = await this.getOrCreate();
    return settings.defaultShippingCost;
  }
}
