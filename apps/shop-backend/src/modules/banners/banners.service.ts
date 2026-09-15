import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { apiEntity } from '../../common/utils/api-entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(onlyActive = false) {
    return (
      await this.prisma.banner.findMany({
        where: onlyActive ? { isActive: true } : {},
        orderBy: { createdAt: 'desc' },
      })
    ).map(apiEntity);
  }
  async create(dto: CreateBannerDto) {
    return apiEntity(await this.prisma.banner.create({ data: dto }));
  }
  async update(id: string, dto: UpdateBannerDto) {
    const exists = await this.prisma.banner.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('بنر پیدا نشد');
    return apiEntity(
      await this.prisma.banner.update({ where: { id }, data: dto }),
    );
  }
  async remove(id: string) {
    try {
      await this.prisma.banner.delete({ where: { id } });
    } catch {
      throw new NotFoundException('بنر پیدا نشد');
    }
  }
}
