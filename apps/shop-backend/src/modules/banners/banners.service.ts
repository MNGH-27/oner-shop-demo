import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner, BannerDocument } from './schemas/banner.schema';
@Injectable()
export class BannersService {
  constructor(@InjectModel(Banner.name) private readonly model: Model<BannerDocument>) {}
  findAll(onlyActive = false) { return this.model.find(onlyActive ? { isActive: true } : {}).select('-link').sort({ createdAt: -1 }).exec(); }
  create(dto: CreateBannerDto) { return this.model.create(dto); }
  async update(id: string, dto: UpdateBannerDto) { const item = await this.model.findByIdAndUpdate(id, dto, { new: true }).select('-link').exec(); if (!item) throw new NotFoundException('بنر پیدا نشد'); return item; }
  async remove(id: string) { const item = await this.model.findByIdAndDelete(id).exec(); if (!item) throw new NotFoundException('بنر پیدا نشد'); }
}
