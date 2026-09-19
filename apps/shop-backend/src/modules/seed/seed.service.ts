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
    const freshDatabase = (await this.prisma.category.count()) === 0;
    await this.prisma.setting.upsert({
      where: { key: 'shop' },
      update: {},
      create: { key: 'shop', defaultShippingCost: 50000 },
    });
    const syncCategory = async (input: {
      name: string;
      legacyNames: string[];
      description: string;
      image: string;
      sortOrder: number;
    }) => {
      const candidates = await this.prisma.category.findMany({
        where: { name: { in: [input.name, ...input.legacyNames] } },
        orderBy: { createdAt: 'asc' },
      });
      const selected =
        candidates.find((category) => category.name === input.name) ??
        candidates[0];
      const target = selected
        ? await this.prisma.category.update({
            where: { id: selected.id },
            data: {
              name: input.name,
              description: input.description,
              image: input.image,
              sortOrder: input.sortOrder,
              isActive: true,
              parentId: null,
            },
          })
        : await this.prisma.category.create({
            data: {
              name: input.name,
              description: input.description,
              image: input.image,
              sortOrder: input.sortOrder,
            },
          });
      for (const duplicate of candidates.filter(
        (category) => category.id !== target.id,
      )) {
        await this.prisma.product.updateMany({
          where: { categoryId: duplicate.id },
          data: { categoryId: target.id },
        });
        await this.prisma.category.updateMany({
          where: { parentId: duplicate.id },
          data: { parentId: target.id },
        });
        await this.prisma.category.delete({ where: { id: duplicate.id } });
      }
      return target;
    };
    const [bedding, clothing] = await Promise.all([
      syncCategory({
        name: 'کالای خواب کودک',
        legacyNames: ['الکترونیک', 'خانه و آشپزخانه'],
        description: 'روانداز، بالش، قنداق و سرویس خواب کودک',
        image: '/uploads/oner-product-1.jpg',
        sortOrder: 1,
      }),
      syncCategory({
        name: 'پوشاک و منسوجات کودک',
        legacyNames: ['مد و پوشاک'],
        description: 'لباس و منسوجات لطیف مناسب نوزاد و کودک',
        image: '/uploads/oner-product-2.jpg',
        sortOrder: 2,
      }),
    ]);
    const productSpecs = [
      {
        name: 'روانداز موسلین چهارلایه',
        legacyNames: ['هدفون بی‌سیم'],
        description: 'روانداز سبک و تنفس‌پذیر با چهار لایه پارچه موسلین',
        price: 890000,
        images: ['/uploads/oner-product-3.jpg'],
        categoryId: bedding.id,
        stock: 24,
        colors: [],
        sizes: [{ label: '۱۲۰ × ۸۰' }],
        sizeType: 'dimension',
        variants: [],
      },
      {
        name: 'قنداق موسلین نوزاد',
        legacyNames: ['ماگ سرامیکی'],
        description: 'قنداق نرم و لطیف برای پوست حساس نوزاد',
        price: 540000,
        images: ['/uploads/oner-product-2.jpg'],
        categoryId: clothing.id,
        stock: 36,
        colors: [{ name: 'کرم' }, { name: 'سفید' }],
        sizes: [{ label: '۰ تا ۶ ماه' }, { label: '۶ تا ۱۲ ماه' }],
        sizeType: 'letter',
        variants: [
          { color: 'کرم', size: '۰ تا ۶ ماه', stock: 9 },
          { color: 'کرم', size: '۶ تا ۱۲ ماه', stock: 9 },
          { color: 'سفید', size: '۰ تا ۶ ماه', stock: 9 },
          { color: 'سفید', size: '۶ تا ۱۲ ماه', stock: 9 },
        ],
      },
      {
        name: 'ست لباس راحتی نخی کودک',
        legacyNames: ['تی‌شرت نخی'],
        description: 'ست نخی سبک و راحت برای استفاده روزمره کودک',
        price: 620000,
        images: ['/uploads/oner-product-4.jpg'],
        categoryId: clothing.id,
        stock: 28,
        colors: [{ name: 'شیری' }, { name: 'سبز سدری' }],
        sizes: [{ label: '۱ تا ۲ سال' }, { label: '۲ تا ۳ سال' }],
        sizeType: 'letter',
        variants: [
          { color: 'شیری', size: '۱ تا ۲ سال', stock: 7 },
          { color: 'شیری', size: '۲ تا ۳ سال', stock: 7 },
          { color: 'سبز سدری', size: '۱ تا ۲ سال', stock: 7 },
          { color: 'سبز سدری', size: '۲ تا ۳ سال', stock: 7 },
        ],
      },
      {
        name: 'بالش موسلین کودک',
        legacyNames: ['شارژر سریع'],
        description: 'بالش لطیف و سبک با رویه موسلین قابل شست‌وشو',
        price: 490000,
        images: ['/uploads/oner-product-1.jpg'],
        categoryId: bedding.id,
        stock: 32,
        colors: [],
        sizes: [{ label: '۴۰ × ۳۰' }],
        sizeType: 'dimension',
        variants: [],
      },
      {
        name: 'ست کامل خواب موسلین کودک',
        legacyNames: [],
        description:
          'ست سه‌تکه شامل روانداز، ملحفه کش‌دار و بالش موسلین با طرح گیاهی',
        price: 2450000,
        images: [
          '/uploads/muslin-bedding-main.png',
          '/uploads/muslin-bedding-flatlay.png',
          '/uploads/muslin-bedding-detail.png',
        ],
        categoryId: bedding.id,
        stock: 14,
        colors: [],
        sizes: [{ label: 'تخت کودک ۱۳۰ × ۷۰' }],
        sizeType: 'dimension',
        variants: [],
      },
    ];
    const products = [];
    for (const spec of productSpecs) {
      const existing = await this.prisma.product.findFirst({
        where: { name: { in: [spec.name, ...spec.legacyNames] } },
      });
      if (existing) {
        await this.prisma.productVariant.deleteMany({
          where: { productId: existing.id },
        });
      }
      const data = {
        name: spec.name,
        description: spec.description,
        price: spec.price,
        shippingCost: 50000,
        images: spec.images,
        categoryId: spec.categoryId,
        stock: spec.stock,
        colors: spec.colors,
        sizes: spec.sizes,
        sizeType: spec.sizeType,
        isActive: true,
        variants: spec.variants.length ? { create: spec.variants } : undefined,
      };
      products.push(
        existing
          ? await this.prisma.product.update({
              where: { id: existing.id },
              data,
            })
          : await this.prisma.product.create({ data }),
      );
    }
    if (!freshDatabase) {
      this.logger.log('Existing demo catalog synchronized');
      return;
    }
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
