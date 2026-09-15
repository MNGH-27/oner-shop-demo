import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { discountedPrice } from '../../common/utils/pricing';
import { PrismaService } from '../../database/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ReplaceCartDto } from './dto/replace-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}
  private async assertActiveCategory(categoryId: string) {
    const visited = new Set<string>();
    let currentId: string | null = categoryId;
    while (currentId) {
      if (visited.has(currentId)) {
        throw new NotFoundException('Product not found');
      }
      visited.add(currentId);
      const category: { parentId: string | null; isActive: boolean } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true, isActive: true },
        });
      if (!category?.isActive) {
        throw new NotFoundException('Product not found');
      }
      currentId = category.parentId;
    }
  }
  private getOrCreate(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: { include: { product: { include: { variants: true } } } },
      },
    });
  }
  private async available(
    productId: string,
    quantity: number,
    selection?: { color?: string; size?: string },
  ) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });
    if (!p || !p.isActive) throw new NotFoundException('Product not found');
    await this.assertActiveCategory(p.categoryId);
    const colors = p.colors as Array<{ name: string }>;
    const sizes = p.sizes as Array<{ label: string }>;
    if (
      colors.length &&
      (!selection?.color || !colors.some((c) => c.name === selection.color))
    )
      throw new BadRequestException(
        selection?.color
          ? 'رنگ انتخاب‌شده برای این محصول معتبر نیست'
          : 'انتخاب رنگ الزامی است',
      );
    if (
      sizes.length &&
      (!selection?.size || !sizes.some((s) => s.label === selection.size))
    )
      throw new BadRequestException(
        selection?.size
          ? 'سایز انتخاب‌شده برای این محصول معتبر نیست'
          : 'انتخاب سایز الزامی است',
      );
    const v = p.variants.length
      ? p.variants.find(
          (x) =>
            x.color === (selection?.color ?? '') &&
            x.size === (selection?.size ?? ''),
        )
      : undefined;
    if (p.variants.length && !v)
      throw new BadRequestException('این ترکیب رنگ و سایز موجود نیست');
    const stock = v?.stock ?? p.stock;
    if (stock < quantity)
      throw new BadRequestException(
        `Insufficient stock for "${p.name}". Available: ${stock}`,
      );
    return p;
  }
  async getCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    const items = cart.items.map((i) => {
      const v = i.product.variants.find(
        (x) => x.color === i.color && x.size === i.size,
      );
      const unitPrice = discountedPrice(
        i.product.price,
        i.product.discountPercent,
      );
      return {
        product: {
          id: i.product.id,
          _id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          discountPercent: i.product.discountPercent,
          shippingCost: i.product.shippingCost,
          images: i.product.images,
          stock: v?.stock ?? i.product.stock,
          isActive: i.product.isActive,
        },
        quantity: i.quantity,
        color: i.color || undefined,
        size: i.size || undefined,
        lineTotal: unitPrice * i.quantity,
      };
    });
    return {
      id: cart.id,
      _id: cart.id,
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    };
  }
  async addItem(userId: string, dto: AddToCartDto) {
    const color = dto.color ?? '',
      size = dto.size ?? '';
    const cart = await this.getOrCreate(userId);
    const existing = cart.items.find(
      (i) =>
        i.productId === dto.productId && i.color === color && i.size === size,
    );
    const quantity = (existing?.quantity ?? 0) + dto.quantity;
    await this.available(dto.productId, quantity, dto);
    if (existing)
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity },
      });
    else
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
          color,
          size,
        },
      });
    return this.getCart(userId);
  }
  async replaceCart(userId: string, dto: ReplaceCartDto) {
    const merged = new Map<string, AddToCartDto>();
    for (const item of dto.items) {
      const color = item.color ?? '';
      const size = item.size ?? '';
      const key = `${item.productId}\u0000${color}\u0000${size}`;
      const existing = merged.get(key);
      merged.set(key, {
        productId: item.productId,
        color,
        size,
        quantity: (existing?.quantity ?? 0) + item.quantity,
      });
    }

    const items = [...merged.values()];
    await Promise.all(
      items.map((item) => this.available(item.productId, item.quantity, item)),
    );
    const cart = await this.getOrCreate(userId);
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      ...(items.length
        ? [
            this.prisma.cartItem.createMany({
              data: items.map((item) => ({
                cartId: cart.id,
                productId: item.productId,
                quantity: item.quantity,
                color: item.color ?? '',
                size: item.size ?? '',
              })),
            }),
          ]
        : []),
    ]);
    return this.getCart(userId);
  }
  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    await this.available(productId, dto.quantity, dto);
    const cart = await this.getOrCreate(userId);
    const item = cart.items.find(
      (i) =>
        i.productId === productId &&
        i.color === (dto.color ?? '') &&
        i.size === (dto.size ?? ''),
    );
    if (!item) throw new NotFoundException('Item not found in cart');
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.getCart(userId);
  }
  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreate(userId);
    const result = await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    if (!result.count) throw new NotFoundException('Item not found in cart');
    return this.getCart(userId);
  }
  async clearCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }
  getCartDocument(userId: string) {
    return this.getOrCreate(userId);
  }
}
