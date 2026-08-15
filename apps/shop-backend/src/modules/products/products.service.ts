import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductVariantStockDto } from './dto/update-product-stock.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService implements OnModuleInit {
  private async assertRelatedProducts(ids?: string[]): Promise<void> {
    if (!ids?.length) return;
    const uniqueIds = [...new Set(ids)];
    const count = await this.productModel.countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more related products do not exist');
    }
  }

  private sanitizeDescription(html?: string): string {
    if (!html) return '';
    const cleaned = sanitizeHtml(html, {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'div', 'span', 'p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'br', 'hr', 'a'],
      allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['class', 'style'] },
      allowedClasses: { '*': ['ql-align-center', 'ql-align-right', 'ql-align-justify'] },
      allowedStyles: { '*': { 'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/], 'font-size': [/^\d+(?:px|pt|em|rem|%)$/] } },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
    const plainText = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
    return plainText ? cleaned : '';
  }
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

  private async categoryWithDescendants(categoryId: string): Promise<string[]> {
    const ids = [categoryId];
    let parents = [categoryId];
    while (parents.length) {
      const children = await this.categoryModel.find({ parent: { $in: parents } }).select('_id').lean().exec();
      parents = children.map((item) => String(item._id));
      ids.push(...parents);
    }
    return ids;
  }

  private productAdminUrl(productId: string): string {
    const base = this.config.get<string>('adminPanelUrl') ?? 'http://127.0.0.1:5173';
    return `${base}/products?highlight=${productId}`;
  }

  private async maybeNotifyLowStock(product: ProductDocument): Promise<void> {
    if (product.variants?.length) {
      let changed = false;
      for (const variant of product.variants) {
        const threshold = variant.lowStockThreshold;
        if (threshold === null || threshold === undefined) {
          if (variant.lowStockNotified) {
            variant.lowStockNotified = false;
            changed = true;
          }
          continue;
        }

        if (variant.stock > threshold) {
          if (variant.lowStockNotified) {
            variant.lowStockNotified = false;
            changed = true;
          }
          continue;
        }

        if (variant.lowStockNotified) continue;

        const variantName = [variant.color, variant.size]
          .filter(Boolean)
          .join(' / ');
        await this.telegramService.sendMessage(
          [
            'نوع اعلان: موجودی کم تنوع محصول',
            `کالا: ${product.name}`,
            `تنوع: ${variantName || 'پیش‌فرض'}`,
            `موجودی فعلی: ${variant.stock} — آستانه: ${threshold}`,
            `دسترسی: ${this.productAdminUrl(product.id as string)}`,
          ].join('\n'),
        );
        variant.lowStockNotified = true;
        changed = true;
      }

      if (changed) await product.save();
      return;
    }

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
    await this.assertRelatedProducts(dto.relatedProducts);

    const defaultShipping =
      await this.settingsService.getDefaultShippingCost();

    const product = await this.productModel.create({
      ...dto,
      descriptionHtml: this.sanitizeDescription(dto.descriptionHtml),
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
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
    },
  ) {
    const query: Record<string, unknown> = {};

    if (filters?.category) query.category = { $in: await this.categoryWithDescendants(filters.category) };
    if (filters?.onlyActive === true) query.isActive = true;
    if (filters?.search) {
      query.$text = { $search: filters.search };
    }
    if (filters?.inStock) query.stock = { $gt: 0 };
    const priceRangeQuery = { ...query };
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) query.price = { ...(filters.minPrice !== undefined ? { $gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { $lte: filters.maxPrice } : {}) };

    const skip = (page - 1) * limit;

    const [items, total, cheapest, mostExpensive] = await Promise.all([
      this.productModel
        .find(query)
        .populate('category', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.productModel.countDocuments(query).exec(),
      this.productModel.findOne(priceRangeQuery).sort({ price: 1 }).select('price').lean().exec(),
      this.productModel.findOne(priceRangeQuery).sort({ price: -1 }).select('price').lean().exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        priceRange: { min: cheapest?.price ?? 0, max: mostExpensive?.price ?? 0 },
      },
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name')
      .populate('relatedProducts', 'name images price discountPercent category stock isActive')
      .exec();

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findActiveById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ _id: id, isActive: true })
      .populate('category', 'name')
      .populate({
        path: 'relatedProducts',
        match: { isActive: true },
        select: 'name images price discountPercent category stock isActive',
      })
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    if (dto.category) {
      await this.assertCategoryExists(dto.category);
    }
    if (dto.relatedProducts?.includes(id)) {
      throw new BadRequestException('A product cannot be related to itself');
    }
    await this.assertRelatedProducts(dto.relatedProducts);

    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    const definedUpdates = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(
      product,
      definedUpdates,
      dto.descriptionHtml === undefined
        ? {}
        : { descriptionHtml: this.sanitizeDescription(dto.descriptionHtml) },
    );
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

  async setVariants(
    id: string,
    variants: ProductVariantStockDto[],
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    const seen = new Set<string>();
    for (const variant of variants) {
      const key = `${variant.color ?? ''}::${variant.size ?? ''}`;
      if (seen.has(key)) {
        throw new BadRequestException('ترکیب رنگ و سایز تکراری است');
      }
      seen.add(key);

      if (product.colors.length && !variant.color) {
        throw new BadRequestException('رنگ همه تنوع‌ها باید مشخص باشد');
      }
      if (
        variant.color &&
        !product.colors.some((color) => color.name === variant.color)
      ) {
        throw new BadRequestException(`رنگ «${variant.color}» معتبر نیست`);
      }
      if (product.sizes.length && !variant.size) {
        throw new BadRequestException('سایز همه تنوع‌ها باید مشخص باشد');
      }
      if (
        variant.size &&
        !product.sizes.some((size) => size.label === variant.size)
      ) {
        throw new BadRequestException(`سایز «${variant.size}» معتبر نیست`);
      }
    }

    product.set(
      'variants',
      variants.map((variant) => ({
        ...variant,
        lowStockThreshold: variant.lowStockThreshold ?? null,
        lowStockNotified: false,
      })),
    );
    product.stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    await product.save();
    await this.maybeNotifyLowStock(product);
    return this.findById(id);
  }

  /** Internal use (orders) — decrease/increase stock by delta */
  async adjustStock(
    id: string,
    quantityDelta: number,
    selection?: { color?: string; size?: string },
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    if (product.variants?.length) {
      const variant = product.variants.find(
        (item) =>
          (item.color ?? '') === (selection?.color ?? '') &&
          (item.size ?? '') === (selection?.size ?? ''),
      );
      if (!variant) {
        throw new BadRequestException('تنوع انتخاب‌شده برای محصول پیدا نشد');
      }

      const nextVariantStock = variant.stock + quantityDelta;
      if (nextVariantStock < 0) {
        throw new BadRequestException('موجودی این رنگ و سایز کافی نیست');
      }
      variant.stock = nextVariantStock;
      product.stock = product.variants.reduce((sum, item) => sum + item.stock, 0);
      await product.save();
      await this.maybeNotifyLowStock(product);
      return this.findById(id);
    }

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
