import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { withoutPassword } from '../../common/utils/api-entity';
import { UserRole } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
const emailFromPhone = (phone: string) => `${phone}@phone.local`;
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  private async assertActiveAdminRemains(
    current: { role: string; isActive: boolean },
    nextRole: string,
    nextActive: boolean,
  ) {
    if (
      current.role === 'admin' &&
      current.isActive &&
      (nextRole !== 'admin' || !nextActive) &&
      (await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      })) <= 1
    ) {
      throw new BadRequestException(
        'آخرین مدیر فعال را نمی‌توان حذف، غیرفعال یا به مشتری تبدیل کرد',
      );
    }
  }
  async create(dto: CreateUserDto) {
    const phone = dto.phone.trim();
    const email = dto.email?.trim().toLowerCase() || emailFromPhone(phone);
    if (
      await this.prisma.user.findFirst({
        where: { OR: [{ phone }, { email }] },
      })
    )
      throw new BadRequestException(
        'این شماره همراه یا ایمیل قبلاً ثبت شده است',
      );
    const user = await this.prisma.user
      .create({
        data: {
          email,
          phone,
          password: await bcrypt.hash(dto.password, 10),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role ?? UserRole.CUSTOMER,
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException(
            'این شماره همراه یا ایمیل قبلاً ثبت شده است',
          );
        }
        throw error;
      });
    return withoutPassword(user);
  }
  private where(filters?: {
    role?: UserRole;
    search?: string;
    isActive?: boolean;
  }): Prisma.UserWhereInput {
    return {
      ...(filters?.role ? { role: filters.role } : {}),
      ...(filters?.isActive !== undefined
        ? { isActive: filters.isActive }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { phone: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
  async findAll(
    page = 1,
    limit = 20,
    filters?: { role?: UserRole; search?: string; isActive?: boolean },
  ) {
    const where = this.where(filters);
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map(withoutPassword),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
  async getStats() {
    const [total, active, admin, customer] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({ where: { role: 'customer' } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      byRole: { admin, customer },
    };
  }
  async setActive(id: string, isActive: boolean) {
    const current = await this.require(id);
    await this.assertActiveAdminRemains(current, current.role, isActive);
    return withoutPassword(
      await this.prisma.user.update({ where: { id }, data: { isActive } }),
    );
  }
  private async require(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  async findById(id: string) {
    return withoutPassword(await this.require(id));
  }
  async changePassword(
    id: string,
    newPassword: string,
    currentPassword?: string,
    allowWithoutCurrent = false,
  ) {
    const user = await this.require(id);
    if (
      !allowWithoutCurrent &&
      (!currentPassword ||
        !(await bcrypt.compare(currentPassword, user.password)))
    ) {
      throw new UnauthorizedException('رمز عبور فعلی صحیح نیست');
    }

    await this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }
  async findProfileById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return withoutPassword(user);
  }
  findByEmail(email: string, withPassword = false) {
    return this.prisma.user
      .findUnique({ where: { email: email.toLowerCase() } })
      .then((u) => (u ? (withPassword ? u : withoutPassword(u)) : null));
  }
  findByPhone(phone: string, withPassword = false) {
    return this.prisma.user
      .findUnique({ where: { phone } })
      .then((u) => (u ? (withPassword ? u : withoutPassword(u)) : null));
  }
  async findOrCreateOtpCustomer(phone: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      this.assertOtpCustomer(existing);
      return {
        user: await this.prisma.user.update({
          where: { id: existing.id },
          data: { phoneVerifiedAt: new Date() },
        }),
        isNewUser: false,
      };
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: emailFromPhone(phone),
          phone,
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          firstName: 'کاربر',
          lastName: 'اونر',
          role: UserRole.CUSTOMER,
          isActive: true,
          phoneVerifiedAt: new Date(),
          profileCompleted: false,
        },
      });
      return { user, isNewUser: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const racedUser = await this.prisma.user.findUnique({
          where: { phone },
        });
        if (racedUser) {
          this.assertOtpCustomer(racedUser);
          return {
            user: await this.prisma.user.update({
              where: { id: racedUser.id },
              data: { phoneVerifiedAt: new Date() },
            }),
            isNewUser: false,
          };
        }
      }
      throw error;
    }
  }
  async update(id: string, dto: UpdateUserDto) {
    const current = await this.require(id);
    await this.assertActiveAdminRemains(
      current,
      dto.role ?? current.role,
      dto.isActive ?? current.isActive,
    );
    if (
      dto.phone &&
      (await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      }))
    )
      throw new BadRequestException('این شماره همراه قبلاً ثبت شده است');
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    if (firstName !== undefined && firstName.length < 2) {
      throw new BadRequestException('نام باید حداقل ۲ حرف باشد');
    }
    if (lastName !== undefined && lastName.length < 2) {
      throw new BadRequestException('نام خانوادگی باید حداقل ۲ حرف باشد');
    }
    const nextFirstName = firstName ?? current.firstName;
    const nextLastName = lastName ?? current.lastName;
    const phoneChanged = Boolean(dto.phone && dto.phone !== current.phone);
    const data: Prisma.UserUpdateInput = {
      ...dto,
      firstName,
      lastName,
      phone: dto.phone?.trim(),
      role: dto.role,
      password: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
      phoneVerifiedAt: phoneChanged ? null : undefined,
      profileCompleted:
        dto.firstName !== undefined || dto.lastName !== undefined
          ? nextFirstName.length >= 2 && nextLastName.length >= 2
          : undefined,
    };
    return withoutPassword(
      await this.prisma.user.update({ where: { id }, data }),
    );
  }
  async remove(id: string) {
    const current = await this.require(id);
    await this.assertActiveAdminRemains(current, UserRole.CUSTOMER, false);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'کاربری که سفارش ثبت‌شده دارد قابل حذف نیست؛ او را غیرفعال کنید',
        );
      }
      throw error;
    }
  }

  private assertOtpCustomer(user: { role: PrismaUserRole; isActive: boolean }) {
    if (user.role !== PrismaUserRole.customer || !user.isActive) {
      throw new UnauthorizedException('ورود پیامکی برای این حساب مجاز نیست');
    }
  }
}
