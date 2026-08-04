import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly settingsService: SettingsService,
    private readonly telegramService: TelegramService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    for (const name of ['slug_1', 'sku_1']) {
      try {
        await this.productModel.collection.dropIndex(name);
      } catch {
        /* ignore */
      }
    }
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new BadRequestException('Category not found');
    }
  }

  private productAdminUrl(productId: string): string {
    const base = this.config.get<string>('adminPanelUrl') ?? 'http://127.0.0.1:5173';
    return `${base}/products?highlight=${productId}`;
  }

  private async maybeNotifyLowStock(product: ProductDocument): Promise<void> {
    const threshold = product.lowStockThreshold;
    if (threshold === null || threshold === undefined) {
      if (product.lowStockNotified) {
        product.lowStockNotified = false;
        await product.save();
      }
      return;
    }

    if (product.stock > threshold) {
      if (product.lowStockNotified) {
        product.lowStockNotified = false;
        await product.save();
      }
      return;
    }

    if (product.lowStockNotified) {
      return;
    }

    const productId = product.id as string;
    await this.telegramService.sendMessage(
      [
        'نوع اعلان: موجودی کم',
        `کالا: ${product.name}`,
        `دسترسی: ${this.productAdminUrl(productId)}`,
        '',
        `موجودی فعلی: ${product.stock} — آستانه: ${threshold}`,
      ].join('\n'),
    );

    product.lowStockNotified = true;
    await product.save();
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    await this.assertCategoryExists(dto.category);

    const defaultShipping =
      await this.settingsService.getDefaultShippingCost();

    const product = await this.productModel.create({
      ...dto,
      price: dto.price ?? 0,
      stock: dto.stock ?? 0,
      shippingCost: dto.shippingCost ?? defaultShipping,
      lowStockThreshold:
        dto.lowStockThreshold === undefined ? null : dto.lowStockThreshold,
      lowStockNotified: false,
    });

    await this.maybeNotifyLowStock(product);
    return this.findById(product.id);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      category?: string;
      search?: string;
      onlyActive?: boolean;
    },
  ) {
    const query: Record<string, unknown> = {};

    if (filters?.category) query.category = filters.category;
    if (filters?.onlyActive === true) query.isActive = true;
    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(query)
        .populate('category', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.productModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name')
      .exec();

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    if (dto.category) {
      await this.assertCategoryExists(dto.category);
    }

    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    Object.assign(product, dto);
    if (dto.lowStockThreshold === null) {
      product.lowStockThreshold = null;
    }
    await product.save();
    await this.maybeNotifyLowStock(product);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }

  async updatePrice(id: string, price: number): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    product.price = price;
    await product.save();
    return this.findById(id);
  }

  async setStock(
    id: string,
    stock: number,
    lowStockThreshold?: number | null,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    product.stock = stock;
    if (lowStockThreshold !== undefined) {
      product.lowStockThreshold = lowStockThreshold;
    }
    await product.save();
    await this.maybeNotifyLowStock(product);
    return this.findById(id);
  }

  /** Internal use (orders) — decrease/increase stock by delta */
  async adjustStock(id: string, quantityDelta: number): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    const nextStock = product.stock + quantityDelta;
    if (nextStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    product.stock = nextStock;
    await product.save();
    await this.maybeNotifyLowStock(product);
    return this.findById(id);
  }
}
