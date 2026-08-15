import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CouponDto } from './dto/coupon.dto';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private readonly model: Model<CouponDocument>) {}
  list() { return this.model.find().sort({ createdAt: -1 }).exec() }
  create(dto: CouponDto) { return this.model.create({ ...dto, code: dto.code.toUpperCase() }) }
  async update(id: string, dto: CouponDto) { const item = await this.model.findByIdAndUpdate(id, { ...dto, code: dto.code.toUpperCase() }, { new: true, runValidators: true }).exec(); if (!item) throw new NotFoundException('کد تخفیف پیدا نشد'); return item }
  async remove(id: string) { const item = await this.model.findByIdAndDelete(id).exec(); if (!item) throw new NotFoundException('کد تخفیف پیدا نشد') }
  async validate(code: string, amount: number) { const item = await this.model.findOne({ code: code.toUpperCase(), isActive: true }).exec(); if (!item || (item.expiresAt && item.expiresAt < new Date())) throw new BadRequestException('کد تخفیف معتبر نیست'); if (amount < item.minimumAmount) throw new BadRequestException(`حداقل خرید برای این کد ${item.minimumAmount} تومان است`); const calculated = Math.round(amount * item.percent / 100); const discount = item.maximumDiscountAmount > 0 ? Math.min(calculated, item.maximumDiscountAmount) : calculated; return { code: item.code, percent: item.percent, minimumAmount: item.minimumAmount, maximumDiscountAmount: item.maximumDiscountAmount, discount, finalAmount: Math.max(0, amount - discount) } }
}
