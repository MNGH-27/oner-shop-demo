import type {
  PaginatedProducts,
  StoreBanner,
  StoreCategory,
  StoreCategoryNode,
  StoreProduct,
} from "@core/types/shop.types";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api";
export const MEDIA_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://127.0.0.1:5000";
export function entityId(entity: StoreProduct): string {
  return entity.id ?? entity._id ?? "";
}
export function mediaUrl(path?: string): string {
  if (!path) return "/window.svg";
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
const fallbackProducts: StoreProduct[] = [
  {
    _id: "demo-1",
    name: "روانداز موسلین چهارلایه",
    description: "روانداز لطیف و تنفس‌پذیر برای خواب آرام کودک",
    price: 890000,
    shippingCost: 50000,
    images: ["/uploads/seed-product-1.jpg"],
    category: { _id: "demo-cat-1", name: "روانداز" },
    stock: 12,
    colors: [{ name: "کرم" }, { name: "سبز سدری" }],
    sizeType: "dimension",
    sizes: [{ label: "120×80", widthCm: 120, lengthCm: 80 }],
    variants: [],
    isActive: true,
  },
  {
    _id: "demo-2",
    name: "ست رختخواب کودک",
    description: "ست خواب مینیمال با پارچه طبیعی و دوخت ظریف",
    price: 2450000,
    shippingCost: 50000,
    images: ["/uploads/seed-product-2.jpg"],
    category: { _id: "demo-cat-2", name: "ست رختخواب" },
    stock: 8,
    colors: [{ name: "شیری" }, { name: "طوسی روشن" }],
    sizeType: "letter",
    sizes: [{ label: "نوزاد" }, { label: "کودک" }],
    variants: [],
    isActive: true,
  },
  {
    _id: "demo-3",
    name: "پتو بافت کودک",
    description: "بافت سبک، گرم و سازگار با پوست حساس کودک",
    price: 1190000,
    shippingCost: 50000,
    images: ["/uploads/seed-product-3.jpg"],
    category: { _id: "demo-cat-3", name: "پتو و بافت" },
    stock: 15,
    colors: [{ name: "بژ" }, { name: "قهوه‌ای روشن" }],
    sizeType: "dimension",
    sizes: [{ label: "100×80", widthCm: 100, lengthCm: 80 }],
    variants: [],
    isActive: true,
  },
  {
    _id: "demo-4",
    name: "بالش چین‌دار کودک",
    description: "بالش نرم و تزئینی با لبه چین‌دار دست‌دوز",
    price: 520000,
    shippingCost: 50000,
    images: ["/uploads/seed-product-4.jpg"],
    category: { _id: "demo-cat-2", name: "ست رختخواب" },
    stock: 20,
    colors: [{ name: "سفید" }, { name: "سبز روشن" }],
    sizeType: "dimension",
    sizes: [{ label: "40×30", widthCm: 40, lengthCm: 30 }],
    variants: [],
    isActive: true,
  },
];
async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
export async function getProducts(params?: {
  search?: string;
  category?: string;
  limit?: number;
  minPrice?: string | number;
  maxPrice?: string | number;
  inStock?: string | boolean;
}): Promise<PaginatedProducts> {
  const query = new URLSearchParams({ limit: String(params?.limit ?? 24) });
  if (params?.search) query.set("search", params.search);
  if (params?.category) query.set("category", params.category);
  if (params?.minPrice) query.set("minPrice", String(params.minPrice));
  if (params?.maxPrice) query.set("maxPrice", String(params.maxPrice));
  if (params?.inStock) query.set("inStock", "true");
  return (
    (await safeFetch<PaginatedProducts>(`/products?${query}`)) ?? {
      items: fallbackProducts,
      meta: { total: 4, page: 1, limit: 24, totalPages: 1, priceRange: { min: Math.min(...fallbackProducts.map((item) => item.price)), max: Math.max(...fallbackProducts.map((item) => item.price)) } },
    }
  );
}
export async function getBanners(): Promise<StoreBanner[]> {
  return (await safeFetch<StoreBanner[]>("/banners")) ?? [];
}
export async function getProduct(id: string): Promise<StoreProduct | null> {
  return (
    (await safeFetch<StoreProduct>(`/products/${id}`)) ??
    fallbackProducts.find((product) => entityId(product) === id) ??
    null
  );
}
export async function getCategories(): Promise<StoreCategory[]> {
  const data = await safeFetch<{ items: StoreCategory[] }>("/categories");
  return data?.items?.length
    ? data.items
    : [
        { _id: "demo-cat-1", name: "روانداز" },
        { _id: "demo-cat-2", name: "ست رختخواب" },
        { _id: "demo-cat-3", name: "پتو و بافت" },
        { _id: "demo-cat-4", name: "موسلین چهارلایه" },
      ];
}
export async function getCategoryTree(): Promise<StoreCategoryNode[]> {
  return (await safeFetch<StoreCategoryNode[]>("/categories/tree")) ?? [];
}
