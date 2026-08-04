import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ user: userId }).exec();
    if (!cart) {
      cart = await this.cartModel.create({
        user: new Types.ObjectId(userId),
        items: [],
      });
    }
    return cart;
  }

  private async assertProductAvailable(productId: string, quantity: number) {
    const product = await this.productModel.findById(productId).exec();
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}`,
      );
    }
    return product;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await cart.populate({
      path: 'items.product',
      select: 'name price images stock isActive shippingCost',
    });

    const items = cart.items
      .filter((item) => item.product)
      .map((item) => {
        const product = item.product as unknown as ProductDocument;
        const lineTotal = product.price * item.quantity;
        return {
          product: {
            id: product._id,
            name: product.name,
            price: product.price,
            shippingCost: product.shippingCost,
            images: product.images,
            stock: product.stock,
            isActive: product.isActive,
          },
          quantity: item.quantity,
          lineTotal,
        };
      });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      id: cart._id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    await this.assertProductAvailable(dto.productId, dto.quantity);

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find(
      (item) => item.product.toString() === dto.productId,
    );

    if (existing) {
      const nextQty = existing.quantity + dto.quantity;
      await this.assertProductAvailable(dto.productId, nextQty);
      existing.quantity = nextQty;
    } else {
      cart.items.push({
        product: new Types.ObjectId(dto.productId),
        quantity: dto.quantity,
      });
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    await this.assertProductAvailable(productId, dto.quantity);

    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    item.quantity = dto.quantity;
    await cart.save();
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.product.toString() !== productId);

    if (cart.items.length === before) {
      throw new NotFoundException('Item not found in cart');
    }

    await cart.save();
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    await cart.save();
    return this.getCart(userId);
  }

  /** Raw cart document for checkout (no populate needed beyond product refs). */
  async getCartDocument(userId: string): Promise<CartDocument> {
    return this.getOrCreateCart(userId);
  }
}
