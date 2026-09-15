import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { apiEntity } from '../../common/utils/api-entity';
import { couponDiscount } from '../../common/utils/pricing';
import { CouponDto } from './dto/coupon.dto';
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    return (
      await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    ).map(apiEntity);
  }
  async create(dto: CouponDto) {
    return apiEntity(
      await this.prisma.coupon.create({
        data: {
          ...dto,
          code: dto.code.trim().toUpperCase(),
          minimumAmount: dto.minimumAmount ?? 0,
          expiresAt: new Date(dto.expiresAt),
        },
      }),
    );
  }
  async update(id: string, dto: CouponDto) {
    const exists = await this.prisma.coupon.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('کد تخفیف پیدا نشد');
    return apiEntity(
      await this.prisma.coupon.update({
        where: { id },
        data: {
          ...dto,
          code: dto.code.trim().toUpperCase(),
          minimumAmount: dto.minimumAmount ?? 0,
          expiresAt: new Date(dto.expiresAt),
        },
      }),
    );
  }
  async remove(id: string) {
    try {
      await this.prisma.coupon.delete({ where: { id } });
    } catch {
      throw new NotFoundException('کد تخفیف پیدا نشد');
    }
  }
  async validate(code: string, amount: number) {
    const item = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!item || !item.isActive || item.expiresAt <= new Date())
      throw new BadRequestException('کد تخفیف معتبر نیست');
    if (amount < item.minimumAmount)
      throw new BadRequestException('مبلغ خرید کمتر از حداقل این کد است');
    return {
      ...apiEntity(item),
      discountAmount: couponDiscount(
        amount,
        item.percent,
        item.maximumDiscountAmount,
      ),
    };
  }
}
