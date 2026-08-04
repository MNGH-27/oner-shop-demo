import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { Model, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/order.enum';
import { UserRole } from '../../common/enums/role.enum';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

const DEMO_IMAGES: Record<string, string> = {
  'seed-cat-electronics.jpg':
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
  'seed-cat-home.jpg':
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80',
  'seed-cat-fashion.jpg':
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
  'seed-product-1.jpg':
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  'seed-product-2.jpg':
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=600&q=80',
  'seed-product-3.jpg':
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
  'seed-product-4.jpg':
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureUploadsDir();
    await this.ensureDefaultAdmin();
    await this.downloadDemoImages();
    await this.seedDemoData();
    await this.refreshExistingDemoImages();
  }

  private ensureUploadsDir() {
    const dir = join(process.cwd(), 'uploads');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private async downloadDemoImages() {
    for (const [filename, url] of Object.entries(DEMO_IMAGES)) {
      const path = join(process.cwd(), 'uploads', filename);
      if (existsSync(path)) continue;
      try {
        await this.downloadFile(url, path);
        this.logger.log(`Downloaded demo image: ${filename}`);
      } catch (error) {
        this.logger.warn(
          `Failed to download ${filename}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async downloadFile(url: string, dest: string) {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }
    const readable = Readable.fromWeb(
      response.body as import('stream/web').ReadableStream,
    );
    await pipeline(readable, createWriteStream(dest));
  }

  private uploadPath(filename: string): string {
    return `/uploads/${filename}`;
  }

  private async ensureDefaultAdmin() {
    const email = this.configService.get<string>('admin.email');
    if (!email) return;

    const password =
      this.configService.get<string>('admin.password') ?? 'Admin@123456';
    const existing = await this.userModel.findOne({ email }).exec();

    if (existing) {
      if (!existing.phone) {
        existing.phone = '09120000000';
        await existing.save();
      }
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await this.userModel.create({
      email,
      password: hashed,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '09120000000',
      role: UserRole.ADMIN,
      isActive: true,
    });
    this.logger.log(`Default admin created: ${email}`);
  }

  private async seedDemoData() {
    const categoryCount = await this.categoryModel.countDocuments().exec();
    if (categoryCount > 0) {
      this.logger.log('Demo seed skipped (data already exists)');
      return;
    }

    const imgCat1 = this.uploadPath('seed-cat-electronics.jpg');
    const imgCat2 = this.uploadPath('seed-cat-home.jpg');
    const imgCat3 = this.uploadPath('seed-cat-fashion.jpg');
    const imgP1 = this.uploadPath('seed-product-1.jpg');
    const imgP2 = this.uploadPath('seed-product-2.jpg');
    const imgP3 = this.uploadPath('seed-product-3.jpg');
    const imgP4 = this.uploadPath('seed-product-4.jpg');

    const electronics = await this.categoryModel.create({
      name: 'الکترونیک',
      description: 'گوشی، لپ‌تاپ و لوازم دیجیتال',
      image: imgCat1,
      isActive: true,
      sortOrder: 1,
    });

    const home = await this.categoryModel.create({
      name: 'خانه و آشپزخانه',
      description: 'وسایل منزل',
      image: imgCat2,
      isActive: true,
      sortOrder: 2,
    });

    const fashion = await this.categoryModel.create({
      name: 'مد و پوشاک',
      description: 'لباس و اکسسوری',
      image: imgCat3,
      isActive: true,
      sortOrder: 3,
    });

    const defaultShipping = 50000;

    const products = await this.productModel.insertMany([
      {
        name: 'هدفون بی‌سیم',
        description: 'هدفون بلوتوث با نویزکنسلینگ',
        price: 1850000,
        shippingCost: defaultShipping,
        images: [imgP1],
        category: electronics._id,
        stock: 25,
        isActive: true,
      },
      {
        name: 'ماگ سرامیکی',
        description: 'ماگ ۴۰۰ میلی‌لیتری',
        price: 189000,
        shippingCost: defaultShipping,
        images: [imgP2],
        category: home._id,
        stock: 80,
        isActive: true,
      },
      {
        name: 'تی‌شرت نخی',
        description: 'تی‌شرت ساده سایز آزاد',
        price: 420000,
        shippingCost: defaultShipping,
        images: [imgP3],
        category: fashion._id,
        stock: 40,
        isActive: true,
      },
      {
        name: 'شارژر سریع',
        description: 'شارژر ۶۵ وات',
        price: 690000,
        shippingCost: defaultShipping,
        images: [imgP4],
        category: electronics._id,
        stock: 55,
        isActive: true,
      },
    ]);

    const hashed = await bcrypt.hash('Customer@123', 10);
    const customers = await this.userModel.insertMany([
      {
        email: '09121111111@phone.local',
        password: hashed,
        firstName: 'علی',
        lastName: 'محمدی',
        phone: '09121111111',
        role: UserRole.CUSTOMER,
        isActive: true,
        addresses: [
          {
            title: 'منزل',
            fullName: 'علی محمدی',
            phone: '09121111111',
            province: 'تهران',
            city: 'تهران',
            addressLine: 'خیابان ولیعصر، پلاک ۱۲',
            postalCode: '1234567890',
            isDefault: true,
          },
        ],
      },
      {
        email: '09122222222@phone.local',
        password: hashed,
        firstName: 'سارا',
        lastName: 'احمدی',
        phone: '09122222222',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      {
        email: '09123333333@phone.local',
        password: hashed,
        firstName: 'رضا',
        lastName: 'کریمی',
        phone: '09123333333',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    ]);

    const product = products[0];
    const customer = customers[0];
    const qty = 2;
    const subtotal = product.price * qty;
    const shippingCost = 50000;

    await this.orderModel.create({
      orderNumber: `ORD-SEED-${Date.now().toString(36).toUpperCase()}`,
      user: customer._id as Types.ObjectId,
      items: [
        {
          product: product._id as Types.ObjectId,
          name: product.name,
          price: product.price,
          quantity: qty,
          image: product.images[0],
        },
      ],
      status: OrderStatus.PENDING,
      shippingAddress: {
        fullName: 'علی محمدی',
        phone: '09121111111',
        province: 'تهران',
        city: 'تهران',
        addressLine: 'خیابان ولیعصر، پلاک ۱۲',
        postalCode: '1234567890',
      },
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.ONLINE,
      subtotal,
      shippingCost,
      totalAmount: subtotal + shippingCost,
      notes: 'سفارش تستی seed',
    });

    this.logger.log(
      `Demo seed done: ${products.length} products, ${customers.length} customers, 1 order`,
    );
  }

  /** Update already-seeded docs that still point at old placeholder PNGs */
  private async refreshExistingDemoImages() {
    const map: Array<{ name: string; image: string }> = [
      { name: 'الکترونیک', image: this.uploadPath('seed-cat-electronics.jpg') },
      { name: 'خانه و آشپزخانه', image: this.uploadPath('seed-cat-home.jpg') },
      { name: 'مد و پوشاک', image: this.uploadPath('seed-cat-fashion.jpg') },
    ];

    for (const item of map) {
      await this.categoryModel
        .updateOne({ name: item.name }, { $set: { image: item.image }, $unset: { slug: 1 } })
        .exec();
    }

    const products: Array<{ name: string; image: string }> = [
      { name: 'هدفون بی‌سیم', image: this.uploadPath('seed-product-1.jpg') },
      { name: 'ماگ سرامیکی', image: this.uploadPath('seed-product-2.jpg') },
      { name: 'تی‌شرت نخی', image: this.uploadPath('seed-product-3.jpg') },
      { name: 'شارژر سریع', image: this.uploadPath('seed-product-4.jpg') },
    ];

    for (const item of products) {
      await this.productModel
        .updateOne(
          { name: item.name },
          {
            $set: {
              images: [item.image],
              shippingCost: 50000,
            },
            $unset: { slug: 1, sku: 1, isFeatured: 1, compareAtPrice: 1 },
          },
        )
        .exec();
    }

    await this.orderModel
      .updateMany(
        { 'items.name': 'هدفون بی‌سیم' },
        { $set: { 'items.$[].image': this.uploadPath('seed-product-1.jpg') } },
      )
      .exec();
  }
}
