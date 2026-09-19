import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}
  async onModuleInit() {
    await this.getOrCreate();
  }
  getOrCreate() {
    return this.prisma.setting.upsert({
      where: { key: 'shop' },
      update: {},
      create: { key: 'shop', shippingCost: 50000 },
    });
  }
  async get() {
    const value = await this.getOrCreate();
    return { shippingCost: value.shippingCost };
  }
  async update(dto: UpdateSettingsDto) {
    const value = await this.prisma.setting.upsert({
      where: { key: 'shop' },
      update: dto,
      create: { key: 'shop', ...dto },
    });
    return { shippingCost: value.shippingCost };
  }
  async getShippingCost() {
    return (await this.getOrCreate()).shippingCost;
  }
}
