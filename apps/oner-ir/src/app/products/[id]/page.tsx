import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@components/modules/catalog/ProductCard";
import { ProductGallery } from "@components/modules/catalog/ProductGallery";
import { ProductPurchase } from "@components/modules/catalog/ProductPurchase";
import { getProduct, getProducts } from "@core/services/api/shop.api";
import { discountedPrice, formatPrice } from "@core/utils/format.utils";
import type { StoreProduct } from "@core/types/shop.types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params,
    product = await getProduct(id);
  return product
    ? {
        title: product.name,
        description: product.description ?? `خرید ${product.name} از Oner`,
      }
    : { title: "محصول پیدا نشد" };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    product = await getProduct(id);
  if (!product) notFound();
  const categoryId =
    typeof product.category === "string"
      ? product.category
      : product.category._id;
  const selectedRelated = (product.relatedProducts ?? []).filter(
    (item): item is StoreProduct => typeof item !== "string" && item.isActive,
  );
  const related = selectedRelated.length
    ? selectedRelated.slice(0, 4)
    : (await getProducts({ category: categoryId, limit: 5 })).items
        .filter((item) => (item.id ?? item._id) !== id)
        .slice(0, 4);
  const finalPrice = discountedPrice(product.price, product.discountPercent);
  return (
    <div className="product-page">
      <div className="breadcrumbs">
        <Link href="/">خانه</Link>
        <span>/</span>
        <Link href="/products">فروشگاه</Link>
        <span>/</span>
        <b>{product.name}</b>
      </div>
      <div className="product-detail">
        <ProductGallery images={product.images} name={product.name} />
        <div className="detail-copy">
          <span className="eyebrow">
            {typeof product.category === "string" ? (
              <span className="brand-name">ONER</span>
            ) : (
              product.category.name
            )}
          </span>
          <h1>{product.name}</h1>
          <div className="detail-price">
            <strong>{formatPrice(finalPrice)}</strong>
            {product.discountPercent ? (
              <>
                <span className="discount-badge">
                  {product.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                </span>
                <del>{formatPrice(product.price)}</del>
              </>
            ) : null}
          </div>
          <p className="detail-desc">
            {product.description ??
              "محصولی لطیف، کاربردی و ماندگار برای کودک شما."}
          </p>
          <ProductPurchase product={product} />
          <div className="detail-meta">
            <span>پارچه لطیف و مناسب کودک</span>
            <span>ارسال به سراسر ایران</span>
            <span>هزینه ارسال فقط یک‌بار برای کل سفارش محاسبه می‌شود</span>
          </div>
        </div>
      </div>
      <section className="product-description">
        <span className="eyebrow">توضیحات محصول</span>
        {product.descriptionHtml ? (
          <div
            className="product-rich-content"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        ) : <p className="description-empty">توضیحی یافت نشد.</p>}
      </section>
      {related.length ? (
        <section className="related-products">
          <div className="section-head">
            <div>
              <span className="eyebrow">پیشنهادهای مشابه</span>
              <h2>محصولات مرتبط</h2>
            </div>
            <Link href={`/products?category=${categoryId}`}>مشاهده همه</Link>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id ?? item._id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
