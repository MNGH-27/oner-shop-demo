import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@components/modules/catalog/ProductCard";
import { BannerSlider } from "@components/modules/banner/BannerSlider";
import { NewsletterForm } from "@components/modules/newsletter/NewsletterForm";
import {
  getBanners,
  getCategories,
  getProducts,
  mediaUrl,
} from "@core/services/api/shop.api";
export default async function Home() {
  const [{ items: products }, categories, banners] = await Promise.all([
    getProducts({ limit: 8 }),
    getCategories(),
    getBanners(),
  ]);
  const hero = products[0];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">کالای خواب کودک Oner</span>
          <h1>
            آرامش،
            <br />
            در لطیف‌ترین شکل خود
          </h1>
          <p>
            منسوجات کودک با پارچه‌های طبیعی، رنگ‌های آرام و دوختی که برای سال‌ها
            کنار شما می‌ماند.
          </p>
          <div className="hero-actions">
            <Link href="/products" className="primary-btn">
              مشاهده مجموعه
            </Link>
            <Link href="/contact" className="text-link">
              سفارش و مشاوره ←
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          {hero ? (
            <Image
              src={mediaUrl(hero.images[0])}
              alt={hero.name}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
            />
          ) : null}
          <div className="hero-note">
            <span>طبیعی و لطیف</span>
            <b>برای پوست حساس کودک</b>
          </div>
        </div>
      </section>
      <section className="values">
        <div>
          <b>پارچه‌های طبیعی</b>
          <span>لطیف و تنفس‌پذیر</span>
        </div>
        <div>
          <b>دوخت با دقت</b>
          <span>جزئیات ماندگار</span>
        </div>
        <div>
          <b>ارسال سراسری</b>
          <span>به تمام ایران</span>
        </div>
      </section>
      <BannerSlider banners={banners} />
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">دنیای Oner</span>
            <h2>برای هر گوشه از خواب کودک</h2>
          </div>
          <Link href="/products">مشاهده همه</Link>
        </div>
        <div className="category-grid">
          {categories.slice(0, 4).map((category, index) => (
            <Link
              key={category._id}
              href={`/products?category=${category._id}`}
              className={`category-card c${index + 1}`}
            >
              <div>
                {category.image ? (
                  <Image
                    src={mediaUrl(category.image)}
                    alt={category.name}
                    fill
                    sizes="25vw"
                  />
                ) : products[index]?.images[0] ? (
                  <Image
                    src={mediaUrl(products[index].images[0])}
                    alt={category.name}
                    fill
                    sizes="25vw"
                  />
                ) : null}
              </div>
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section products-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">تازه‌های Oner</span>
            <h2>محصولات تازه رسیده</h2>
          </div>
          <Link href="/products">مشاهده فروشگاه</Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id ?? product._id} product={product} />
          ))}
        </div>
      </section>
      <section className="story">
        <div className="story-image">
          {products[2] ? (
            <Image
              src={mediaUrl(products[2].images[0])}
              alt="داستان Oner"
              fill
              sizes="50vw"
            />
          ) : null}
        </div>
        <div className="story-copy">
          <span className="eyebrow">داستان Oner</span>
          <h2>لطافت، چیزی فراتر از یک انتخاب است</h2>
          <p>
            ما از جنس، رنگ و جزئیات شروع می‌کنیم تا محصولی بسازیم که فضای اتاق
            کودک را آرام‌تر و لحظه‌های خواب را دلنشین‌تر کند.
          </p>
          <Link href="/contact" className="text-link">
            با ما در ارتباط باشید ←
          </Link>
        </div>
      </section>
      <section className="newsletter">
        <span>نامه‌های آرام Oner</span>
        <h2>از محصولات تازه و قصه‌های ما باخبر شوید</h2>
        <NewsletterForm />
      </section>
    </>
  );
}
