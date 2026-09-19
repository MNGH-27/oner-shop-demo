import Link from "next/link";
import { ProductCard } from "@components/modules/catalog/ProductCard";
import { ProductFilters } from "@components/modules/catalog/ProductFilters";
import { PriceRangeFields } from "@components/modules/catalog/PriceRangeFields";
import { getCategories, getProducts } from "@core/services/api/shop.api";
type Params = {
  search?: string;
  category?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
};
function paginationHref(params: Params, page: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "page") query.set(key, value);
  });
  query.set("page", String(page));
  return `/products?${query.toString()}`;
}
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const [{ items: products, meta }, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ]);
  return (
    <div className="shop-page">
      <header className="page-hero">
        <span className="eyebrow">فروشگاه <span className="brand-name">ONER</span></span>
        <h1>محصولات لطیف برای خواب‌های آرام</h1>
        <p>
          {params.search
            ? `نتایج جست‌وجو برای «${params.search}»`
            : "رنگ، سایز و جزئیات مناسب کودک شما را انتخاب کنید."}
        </p>
      </header>
      <div className="shop-toolbar">
        <div className="category-pills">
          <Link className={!params.category ? "active" : ""} href="/products">
            همه
          </Link>
          {categories.map((category) => (
            <Link
              className={params.category === category._id ? "active" : ""}
              key={category._id}
              href={`/products?category=${category._id}`}
            >
              {category.name}
            </Link>
          ))}
        </div>
        <form>
          <input
            name="search"
            defaultValue={params.search}
            placeholder="جست‌وجوی محصول..."
          />
          <button>جست‌وجو</button>
        </form>
      </div>
      <div className="catalog-layout">
        <ProductFilters>
          <form>
            <input
              type="hidden"
              name="category"
              value={params.category ?? ""}
            />
            <label className="check-filter">
              <input
                type="checkbox"
                name="inStock"
                value="true"
                defaultChecked={params.inStock === "true"}
              />{" "}
              فقط کالاهای موجود
            </label>
            <fieldset>
              <legend>محدوده قیمت</legend>
              <PriceRangeFields
                minPrice={params.minPrice}
                maxPrice={params.maxPrice}
                rangeMin={meta.priceRange.min}
                rangeMax={meta.priceRange.max}
              />
            </fieldset>
            <button className="primary-btn">اعمال فیلتر</button>
            <Link
              href={
                params.category
                  ? `/products?category=${params.category}`
                  : "/products"
              }
            >
              پاک کردن فیلترها
            </Link>
          </form>
        </ProductFilters>
        <section className="catalog-results">
          <div className="results-count">
            نمایش {products.length.toLocaleString("fa-IR")} از{" "}
            {meta.total.toLocaleString("fa-IR")} محصول
          </div>
          {products.length ? (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id ?? product._id}
                    product={product}
                  />
                ))}
              </div>
              {meta.totalPages > 1 ? (
                <nav className="catalog-pagination" aria-label="صفحه‌بندی">
                  {meta.page > 1 ? (
                    <Link href={paginationHref(params, meta.page - 1)}>
                      صفحه قبل
                    </Link>
                  ) : (
                    <span>صفحه قبل</span>
                  )}
                  <b>
                    صفحه {meta.page.toLocaleString("fa-IR")} از{" "}
                    {meta.totalPages.toLocaleString("fa-IR")}
                  </b>
                  {meta.page < meta.totalPages ? (
                    <Link href={paginationHref(params, meta.page + 1)}>
                      صفحه بعد
                    </Link>
                  ) : (
                    <span>صفحه بعد</span>
                  )}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="no-results">محصولی با این فیلتر پیدا نشد.</div>
          )}
        </section>
      </div>
    </div>
  );
}
