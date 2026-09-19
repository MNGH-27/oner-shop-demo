import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Product, ProductVariant } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { apiEntity } from '../../common/utils/api-entity';
import { PrismaService } from '../../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductVariantStockDto } from './dto/update-product-stock.dto';

const includeProduct = {
  category: true,
  variants: true,
  relatedProducts: { include: { category: true, variants: true } },
} as const;
type FullProduct = Prisma.ProductGetPayload<{ include: typeof includeProduct }>;
type RelatedProduct = FullProduct['relatedProducts'][number];
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}
  private mapRelated(row: RelatedProduct) {
    return {
      ...apiEntity(row),
      category: row.category ? apiEntity(row.category) : row.category,
      variants: row.variants.map((v) => ({
        ...apiEntity(v),
        color: v.color || undefined,
        size: v.size || undefined,
      })),
    };
  }
  private map(row: FullProduct) {
    return {
      ...this.mapRelated(row),
      relatedProducts: row.relatedProducts.map((p) => this.mapRelated(p)),
    };
  }
  private sanitize(html?: string) {
    if (!html) return '';
    const clean = sanitizeHtml(html, {
      allowedTags: [
        'h1',
        'h2',
        'h3',
        'h4',
        'div',
        'span',
        'p',
        'strong',
        'em',
        'u',
        's',
        'ul',
        'ol',
        'li',
        'blockquote',
        'br',
        'hr',
        'a',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
        '*': ['class', 'style'],
      },
      allowedClasses: {
        '*': ['ql-align-center', 'ql-align-right', 'ql-align-justify'],
      },
      allowedStyles: {
        '*': {
          'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
          'font-size': [/^\d+(?:px|pt|em|rem|%)$/],
        },
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
    return sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} })
      .replace(/\s+/g, ' ')
      .trim()
      ? clean
      : '';
  }
  private async requireCategory(id: string) {
    if (!(await this.prisma.category.findUnique({ where: { id } })))
      throw new BadRequestException('Category not found');
  }
  private async assertRelated(ids?: string[]) {
    if (!ids?.length) return;
    const unique = [...new Set(ids)];
    if (
      (await this.prisma.product.count({ where: { id: { in: unique } } })) !==
      unique.length
    )
      throw new BadRequestException(
        'One or more related products do not exist',
      );
  }
  private validateVariants(
    colors: Array<{ name: string }>,
    sizes: Array<{ label: string }>,
    variants: ProductVariantStockDto[],
  ) {
    if ((colors.length || sizes.length) && !variants.length) {
      throw new BadRequestException(
        'برای محصول دارای رنگ یا سایز، حداقل یک تنوع لازم است',
      );
    }
    if (!colors.length && !sizes.length && variants.length) {
      throw new BadRequestException(
        'محصول بدون رنگ و سایز نباید تنوع داشته باشد',
      );
    }
    const seen = new Set<string>();
    for (const variant of variants) {
      const color = variant.color ?? '';
      const size = variant.size ?? '';
      const key = `${color}::${size}`;
      if (seen.has(key)) {
        throw new BadRequestException('ترکیب رنگ و سایز تکراری است');
      }
      seen.add(key);
      if (colors.length && !colors.some((item) => item.name === color)) {
        throw new BadRequestException(`رنگ «${color || 'خالی'}» معتبر نیست`);
      }
      if (!colors.length && color) {
        throw new BadRequestException('این محصول رنگ قابل انتخاب ندارد');
      }
      if (sizes.length && !sizes.some((item) => item.label === size)) {
        throw new BadRequestException(`سایز «${size || 'خالی'}» معتبر نیست`);
      }
      if (!sizes.length && size) {
        throw new BadRequestException('این محصول سایز قابل انتخاب ندارد');
      }
    }
  }
  private async descendants(id: string) {
    const visited = new Set<string>([id]);
    let parents = [id];
    while (parents.length) {
      const rows = await this.prisma.category.findMany({
        where: { parentId: { in: parents } },
        select: { id: true },
      });
      parents = rows
        .map((r) => r.id)
        .filter((childId) => {
          if (visited.has(childId)) return false;
          visited.add(childId);
          return true;
        });
    }
    return [...visited];
  }
  private async activeCategoryIds() {
    const rows = await this.prisma.category.findMany({
      select: { id: true, parentId: true, isActive: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const memo = new Map<string, boolean>();
    const isActivePath = (id: string, trail = new Set<string>()): boolean => {
      const cached = memo.get(id);
      if (cached !== undefined) return cached;
      const row = byId.get(id);
      if (!row || !row.isActive || trail.has(id)) {
        memo.set(id, false);
        return false;
      }
      if (!row.parentId) {
        memo.set(id, true);
        return true;
      }
      const nextTrail = new Set(trail);
      nextTrail.add(id);
      const result = isActivePath(row.parentId, nextTrail);
      memo.set(id, result);
      return result;
    };
    return new Set(
      rows.filter((row) => isActivePath(row.id)).map((row) => row.id),
    );
  }
  private adminUrl(id: string) {
    return `${this.config.get<string>('adminPanelUrl') ?? 'http://127.0.0.1:5173'}/products?highlight=${id}`;
  }
  private async notify(row: Product & { variants: ProductVariant[] }) {
    if (row.variants.length) {
      for (const v of row.variants) {
        const should =
          v.lowStockThreshold !== null && v.stock <= v.lowStockThreshold;
        if (should && !v.lowStockNotified) {
          await this.telegram.sendMessage(
            [
              'نوع اعلان: موجودی کم تنوع محصول',
              `کالا: ${row.name}`,
              `تنوع: ${[v.color, v.size].filter(Boolean).join(' / ') || 'پیش‌فرض'}`,
              `موجودی فعلی: ${v.stock} — آستانه: ${v.lowStockThreshold}`,
              `دسترسی: ${this.adminUrl(row.id)}`,
            ].join('\n'),
          );
          await this.prisma.productVariant.update({
            where: { id: v.id },
            data: { lowStockNotified: true },
          });
        } else if (!should && v.lowStockNotified)
          await this.prisma.productVariant.update({
            where: { id: v.id },
            data: { lowStockNotified: false },
          });
      }
      return;
    }
    const should =
      row.lowStockThreshold !== null && row.stock <= row.lowStockThreshold;
    if (should && !row.lowStockNotified) {
      await this.telegram.sendMessage(
        [
          'نوع اعلان: موجودی کم',
          `کالا: ${row.name}`,
          `دسترسی: ${this.adminUrl(row.id)}`,
          `موجودی فعلی: ${row.stock} — آستانه: ${row.lowStockThreshold}`,
        ].join('\n'),
      );
      await this.prisma.product.update({
        where: { id: row.id },
        data: { lowStockNotified: true },
      });
    } else if (!should && row.lowStockNotified)
      await this.prisma.product.update({
        where: { id: row.id },
        data: { lowStockNotified: false },
      });
  }
  async create(dto: CreateProductDto) {
    await this.requireCategory(dto.category);
    await this.assertRelated(dto.relatedProducts);
    const colors = (dto.colors ?? []).map(({ name, hex }) => ({
      name,
      ...(hex ? { hex: hex.toUpperCase() } : {}),
    }));
    const sizes = dto.sizes ?? [];
    const variants = dto.variants ?? [];
    this.validateVariants(colors, sizes, variants);
    const row = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        descriptionHtml: this.sanitize(dto.descriptionHtml),
        price: dto.price ?? 0,
        discountPercent: dto.discountPercent ?? 0,
        images: dto.images ?? [],
        categoryId: dto.category,
        stock: variants.length
          ? variants.reduce((sum, variant) => sum + variant.stock, 0)
          : (dto.stock ?? 0),
        colors: colors as unknown as Prisma.InputJsonValue,
        sizeType: dto.sizeType ?? 'letter',
        sizes: sizes as unknown as Prisma.InputJsonValue,
        lowStockThreshold: dto.lowStockThreshold ?? null,
        isActive: dto.isActive ?? true,
        attributes: dto.attributes ?? {},
        relatedProducts: {
          connect: [...new Set(dto.relatedProducts ?? [])].map((id) => ({
            id,
          })),
        },
        variants: variants.length
          ? {
              create: variants.map((variant) => ({
                color: variant.color ?? '',
                size: variant.size ?? '',
                stock: variant.stock,
                lowStockThreshold: variant.lowStockThreshold ?? null,
              })),
            }
          : undefined,
      },
      include: includeProduct,
    });
    await this.notify(row);
    return this.findById(row.id);
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
    const requestedCategoryIds = filters?.category
      ? await this.descendants(filters.category)
      : undefined;
    const activeCategoryIds = filters?.onlyActive
      ? await this.activeCategoryIds()
      : undefined;
    const categoryIds = requestedCategoryIds
      ? requestedCategoryIds.filter(
          (id) => !activeCategoryIds || activeCategoryIds.has(id),
        )
      : activeCategoryIds
        ? [...activeCategoryIds]
        : undefined;
    const base: Prisma.ProductWhereInput = {
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(filters?.onlyActive ? { isActive: true } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                description: { contains: filters.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
      ...(filters?.inStock ? { stock: { gt: 0 } } : {}),
    };
    const where = {
      ...base,
      ...(filters?.minPrice !== undefined || filters?.maxPrice !== undefined
        ? { price: { gte: filters.minPrice, lte: filters.maxPrice } }
        : {}),
    };
    const [rows, total, range] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: includeProduct,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.aggregate({
        where: base,
        _min: { price: true },
        _max: { price: true },
      }),
    ]);
    return {
      items: rows.map((r) => this.map(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        priceRange: { min: range._min.price ?? 0, max: range._max.price ?? 0 },
      },
    };
  }
  async findById(id: string) {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: includeProduct,
    });
    if (!row) throw new NotFoundException('Product not found');
    return this.map(row);
  }
  async findActiveById(id: string) {
    const row = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: includeProduct,
    });
    if (!row) throw new NotFoundException('Product not found');
    const activeCategoryIds = await this.activeCategoryIds();
    if (!activeCategoryIds.has(row.categoryId)) {
      throw new NotFoundException('Product not found');
    }
    row.relatedProducts = row.relatedProducts.filter(
      (product) =>
        product.isActive && activeCategoryIds.has(product.categoryId),
    );
    return this.map(row);
  }
  async update(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!current) throw new NotFoundException('Product not found');
    if (dto.category) await this.requireCategory(dto.category);
    if (dto.relatedProducts?.includes(id))
      throw new BadRequestException('A product cannot be related to itself');
    await this.assertRelated(dto.relatedProducts);
    const effectiveColors = (dto.colors ?? current.colors) as Array<{
      name: string;
    }>;
    const currentColors = current.colors as Array<{
      name: string;
      hex?: string;
    }>;
    const effectiveSizes = (dto.sizes ?? current.sizes) as Array<{
      label: string;
    }>;
    const effectiveVariants = dto.variants ?? current.variants;
    if (
      dto.variants !== undefined ||
      dto.colors !== undefined ||
      dto.sizes !== undefined
    ) {
      this.validateVariants(effectiveColors, effectiveSizes, effectiveVariants);
    }
    const data: Prisma.ProductUpdateInput = {
      name: dto.name,
      description: dto.description,
      descriptionHtml:
        dto.descriptionHtml === undefined
          ? undefined
          : this.sanitize(dto.descriptionHtml),
      discountPercent: dto.discountPercent,
      images: dto.images,
      category: dto.category ? { connect: { id: dto.category } } : undefined,
      colors: dto.colors?.map(({ name, hex }) => {
        const savedHex = currentColors.find((item) => item.name === name)?.hex;
        return {
          name,
          ...(hex || savedHex
            ? { hex: (hex ?? savedHex)?.toUpperCase() }
            : {}),
        };
      }),
      sizeType: dto.sizeType,
      sizes: dto.sizes?.map(({ label, widthCm, lengthCm }) => ({
        label,
        ...(widthCm !== undefined ? { widthCm } : {}),
        ...(lengthCm !== undefined ? { lengthCm } : {}),
      })),
      lowStockThreshold: dto.lowStockThreshold,
      isActive: dto.isActive,
      attributes: dto.attributes,
      relatedProducts: dto.relatedProducts
        ? { set: [...new Set(dto.relatedProducts)].map((x) => ({ id: x })) }
        : undefined,
      stock:
        dto.variants !== undefined
          ? dto.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : dto.stock,
      variants:
        dto.variants !== undefined
          ? {
              deleteMany: {},
              create: dto.variants.map((variant) => ({
                color: variant.color ?? '',
                size: variant.size ?? '',
                stock: variant.stock,
                lowStockThreshold: variant.lowStockThreshold ?? null,
              })),
            }
          : undefined,
    };
    const row = await this.prisma.product.update({
      where: { id },
      data,
      include: { variants: true },
    });
    await this.notify(row);
    return this.findById(id);
  }
  async remove(id: string) {
    await this.findById(id);
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'محصولی که در سفارش ثبت شده قابل حذف نیست؛ آن را غیرفعال کنید',
        );
      }
      throw error;
    }
  }
  async updatePrice(id: string, price: number) {
    try {
      await this.prisma.product.update({ where: { id }, data: { price } });
    } catch {
      throw new NotFoundException('Product not found');
    }
    return this.findById(id);
  }
  async setStock(id: string, stock: number, lowStockThreshold?: number | null) {
    const row = await this.prisma.product
      .update({
        where: { id },
        data: {
          stock,
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
        },
        include: { variants: true },
      })
      .catch(() => {
        throw new NotFoundException('Product not found');
      });
    await this.notify(row);
    return this.findById(id);
  }
  async setVariants(id: string, variants: ProductVariantStockDto[]) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const colors = product.colors as Array<{ name: string }>;
    const sizes = product.sizes as Array<{ label: string }>;
    this.validateVariants(colors, sizes, variants);
    const stock = variants.reduce((s, v) => s + v.stock, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length) {
        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: id,
            color: v.color ?? '',
            size: v.size ?? '',
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold ?? null,
          })),
        });
      }
      await tx.product.update({ where: { id }, data: { stock } });
    });
    const row = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { variants: true },
    });
    await this.notify(row);
    return this.findById(id);
  }
  async adjustStock(
    id: string,
    delta: number,
    selection?: { color?: string; size?: string },
  ) {
    const row = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        include: { variants: true },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (product.variants.length) {
        const variant = product.variants.find(
          (v) =>
            v.color === (selection?.color ?? '') &&
            v.size === (selection?.size ?? ''),
        );
        if (!variant)
          throw new BadRequestException('تنوع انتخاب‌شده برای محصول پیدا نشد');
        if (variant.stock + delta < 0)
          throw new BadRequestException('موجودی این رنگ و سایز کافی نیست');
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: delta } },
        });
        return tx.product.update({
          where: { id },
          data: { stock: { increment: delta } },
          include: { variants: true },
        });
      }
      if (product.stock + delta < 0)
        throw new BadRequestException('Insufficient stock');
      return tx.product.update({
        where: { id },
        data: { stock: { increment: delta } },
        include: { variants: true },
      });
    });
    await this.notify(row);
    return this.findById(id);
  }

  async checkLowStock(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (product) await this.notify(product);
  }
}
