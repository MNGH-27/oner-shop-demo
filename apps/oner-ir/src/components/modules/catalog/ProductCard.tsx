"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Eye, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { entityId, mediaUrl } from "@core/services/api/shop.api";
import type { StoreProduct } from "@core/types/shop.types";
import { discountedPrice, formatPrice } from "@core/utils/format.utils";

function ProductBrand() {
  return <span className="brand-name">ONER</span>;
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const id = entityId(product);
  const finalPrice = discountedPrice(product.price, product.discountPercent);
  const category =
    typeof product.category === "string" ? (
      <ProductBrand />
    ) : (
      product.category?.name
    );

  return (
    <article className="product-card">
      <Link href={`/products/${id}`} className="product-image">
        <Image
          src={mediaUrl(product.images?.[0])}
          alt={product.name}
          fill
          sizes="(max-width:700px) 50vw,25vw"
        />
      </Link>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="quick-trigger">
            <Eye size={15} /> مشاهده سریع
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="quick-overlay" />
          <Dialog.Content className="quick-dialog">
            <Dialog.Title className="sr-only">
              مشاهده سریع {product.name}
            </Dialog.Title>
            <Dialog.Close className="quick-close">
              <X />
            </Dialog.Close>
            <div className="quick-image">
              <Image
                src={mediaUrl(product.images?.[0])}
                alt={product.name}
                fill
                sizes="50vw"
              />
            </div>
            <div className="quick-copy">
              <small>{category}</small>
              <h2>{product.name}</h2>
              <b>{formatPrice(finalPrice)}</b>
              <p>
                {product.description ||
                  "محصولی لطیف و ماندگار برای کودک شما."}
              </p>
              <Link className="primary-btn" href={`/products/${id}`}>
                مشاهده جزئیات و انتخاب
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="product-info">
        <small>
          {typeof product.category === "string" ? (
            <>محصول <ProductBrand /></>
          ) : (
            product.category?.name
          )}
        </small>
        <Link href={`/products/${id}`}>{product.name}</Link>
        {product.discountPercent ? (
          <span className="discount-badge">
            {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
          </span>
        ) : null}
        <div className="product-price-row">
          <b>
            {formatPrice(finalPrice)}
            {product.discountPercent ? <del>{formatPrice(product.price)}</del> : null}
          </b>
          <Link className="product-action" href={`/products/${id}`}>
            <SlidersHorizontal size={13} />
            <span>انتخاب</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
