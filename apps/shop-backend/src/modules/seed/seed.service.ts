import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  async onModuleInit() {
    const dir = join(process.cwd(), 'uploads');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (this.config.get<boolean>('seed.admin')) await this.admin();
    if (this.config.get<boolean>('seed.demo')) await this.demo();
  }
  private async admin() {
    const email = this.config.getOrThrow<string>('admin.email').toLowerCase();
    const password = this.config.getOrThrow<string>('admin.password');
    const phone = this.config.get<string>('admin.phone') ?? '09120000000';
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          password: await bcrypt.hash(password, 10),
          role: UserRole.admin,
          isActive: true,
          ...(!existing.phone ? { phone } : {}),
        },
      });
      this.logger.log(`Configured admin synchronized: ${email}`);
      return;
    }
    await this.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        firstName: 'Super',
        lastName: 'Admin',
        phone,
        role: UserRole.admin,
        isActive: true,
      },
    });
    this.logger.log(`Default admin created: ${email}`);
  }
  private async demo() {
    if (await this.prisma.category.count()) return;
    await this.prisma.setting.upsert({
      where: { key: 'shop' },
      update: {},
      create: { key: 'shop', defaultShippingCost: 50000 },
    });
    const [electronics, home, fashion] = await Promise.all([
      this.prisma.category.create({
        data: {
          name: 'الکترونیک',
          description: 'گوشی، لپ‌تاپ و لوازم دیجیتال',
          image: '/uploads/seed-cat-electronics.jpg',
        },
      }),
      this.prisma.category.create({
        data: {
          name: 'خانه و آشپزخانه',
          description: 'وسایل منزل',
          image: '/uploads/seed-cat-home.jpg',
        },
      }),
      this.prisma.category.create({
        data: {
          name: 'مد و پوشاک',
          description: 'لباس و اکسسوری',
          image: '/uploads/seed-cat-fashion.jpg',
        },
      }),
    ]);
    const products = await Promise.all([
      this.prisma.product.create({
        data: {
          name: 'هدفون بی‌سیم',
          description: 'هدفون بلوتوث با نویزکنسلینگ',
          price: 1850000,
          shippingCost: 50000,
          images: ['/uploads/seed-product-1.jpg'],
          categoryId: electronics.id,
          stock: 25,
        },
      }),
      this.prisma.product.create({
        data: {
          name: 'ماگ سرامیکی',
          description: 'ماگ ۴۰۰ میلی‌لیتری',
          price: 189000,
          shippingCost: 50000,
          images: ['/uploads/seed-product-2.jpg'],
          categoryId: home.id,
          stock: 80,
        },
      }),
      this.prisma.product.create({
        data: {
          name: 'تی‌شرت نخی',
          description: 'تی‌شرت ساده',
          price: 420000,
          shippingCost: 50000,
          images: ['/uploads/seed-product-3.jpg'],
          categoryId: fashion.id,
          stock: 40,
          colors: [{ name: 'سفید' }],
          sizes: [{ label: 'L' }, { label: 'XL' }],
          variants: {
            create: [
              { color: 'سفید', size: 'L', stock: 20 },
              { color: 'سفید', size: 'XL', stock: 20 },
            ],
          },
        },
      }),
      this.prisma.product.create({
        data: {
          name: 'شارژر سریع',
          description: 'شارژر ۶۵ وات',
          price: 690000,
          shippingCost: 50000,
          images: ['/uploads/seed-product-4.jpg'],
          categoryId: electronics.id,
          stock: 55,
        },
      }),
    ]);
    const hashed = await bcrypt.hash('Customer@123', 10);
    const customer = await this.prisma.user.create({
      data: {
        email: '09121111111@phone.local',
        password: hashed,
        firstName: 'علی',
        lastName: 'محمدی',
        phone: '09121111111',
        role: UserRole.customer,
        addresses: {
          create: {
            title: 'منزل',
            fullName: 'علی محمدی',
            phone: '09121111111',
            province: 'تهران',
            city: 'تهران',
            addressLine: 'خیابان ولیعصر، پلاک ۱۲',
            postalCode: '1234567890',
            isDefault: true,
          },
        },
      },
    });
    await Promise.all([
      this.prisma.user.create({
        data: {
          email: '09122222222@phone.local',
          password: hashed,
          firstName: 'سارا',
          lastName: 'احمدی',
          phone: '09122222222',
          role: UserRole.customer,
        },
      }),
      this.prisma.user.create({
        data: {
          email: '09123333333@phone.local',
          password: hashed,
          firstName: 'رضا',
          lastName: 'کریمی',
          phone: '09123333333',
          role: UserRole.customer,
        },
      }),
      this.prisma.banner.create({
        data: {
          title: 'لطیف‌ترین شکل خواب',
          subtitle: 'برای پوست حساس کودک',
          image: '/uploads/oner-product-1.jpg',
        },
      }),
      this.prisma.coupon.create({
        data: {
          code: 'ONER10',
          percent: 10,
          minimumAmount: 100000,
          maximumDiscountAmount: 500000,
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    const product = products[0],
      quantity = 2,
      subtotal = product.price * quantity;
    await this.prisma.order.create({
      data: {
        orderNumber: `ORD-SEED-${Date.now().toString(36).toUpperCase()}`,
        userId: customer.id,
        status: 'pending',
        shippingAddress: {
          fullName: 'علی محمدی',
          phone: '09121111111',
          province: 'تهران',
          city: 'تهران',
          addressLine: 'خیابان ولیعصر، پلاک ۱۲',
          postalCode: '1234567890',
        },
        paymentStatus: PaymentStatus.paid,
        paymentMethod: PaymentMethod.online,
        subtotal,
        shippingCost: 50000,
        totalAmount: subtotal + 50000,
        notes: 'سفارش تستی seed',
        items: {
          create: {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.images[0],
          },
        },
      },
    });
    this.logger.log('PostgreSQL demo seed completed');
  }
}
