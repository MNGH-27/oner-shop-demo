import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { apiEntity } from '../../common/utils/api-entity';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  private clean<T extends CreateAddressDto | UpdateAddressDto>(dto: T): T {
    return Object.fromEntries(
      Object.entries(dto).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    ) as T;
  }

  private async requireOwned(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    id: string,
  ) {
    const address = await tx.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('نشانی پیدا نشد');
    return address;
  }

  async findAll(userId: string) {
    const rows = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(apiEntity);
  }

  async create(userId: string, input: CreateAddressDto) {
    const dto = this.clean(input);
    const row = await this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = count === 0 || dto.isDefault === true;
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: { ...dto, isDefault, userId },
      });
    });
    return apiEntity(row);
  }

  async update(userId: string, id: string, input: UpdateAddressDto) {
    if (!Object.keys(input).length) {
      throw new BadRequestException('حداقل یک تغییر وارد کنید');
    }
    const dto = this.clean(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.requireOwned(tx, userId, id);
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data: dto });
    });
    return apiEntity(row);
  }

  async setDefault(userId: string, id: string) {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.requireOwned(tx, userId, id);
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
    return apiEntity(row);
  }

  async remove(userId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.requireOwned(tx, userId, id);
      await tx.address.delete({ where: { id } });
      if (current.isDefault) {
        const replacement = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });
    return { message: 'نشانی حذف شد' };
  }
}
