export type ProductSizeType = "letter" | "dimension";
export interface ProductColor {
  name: string;
  hex?: string;
}
export interface ProductSize {
  label: string;
  widthCm?: number;
  lengthCm?: number;
}
export interface ProductVariant {
  color?: string;
  size?: string;
  stock: number;
  lowStockThreshold?: number | null;
}
export interface StoreProduct {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  descriptionHtml?: string;
  price: number;
  discountPercent?: number;
  images: string[];
  category: { _id: string; name: string } | string;
  stock: number;
  colors: ProductColor[];
  sizeType: ProductSizeType;
  sizes: ProductSize[];
  variants: ProductVariant[];
  relatedProducts?: Array<string | StoreProduct>;
  isActive: boolean;
}
export interface StoreCategory {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  parent?: string | { _id: string; name: string } | null;
}
export interface StoreCategoryNode extends StoreCategory {
  children: StoreCategoryNode[];
}
export interface PaginatedProducts {
  items: StoreProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    priceRange: { min: number; max: number };
  };
}
export interface AddToCartInput {
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
}
export interface StoreBanner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
}
export interface ShopSettings {
  shippingCost: number;
}
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  phoneVerifiedAt?: string | null;
  profileCompleted?: boolean;
  addresses?: CustomerAddress[];
}
export interface CustomerAddress {
  id: string;
  _id?: string;
  title: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponPreview {
  id?: string;
  _id?: string;
  code: string;
  percent: number;
  minimumAmount: number;
  maximumDiscountAmount: number;
  discountAmount: number;
}

export type StoreOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface StoreOrder {
  id: string;
  _id?: string;
  orderNumber: string;
  status: StoreOrderStatus;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: "online";
  subtotal: number;
  shippingCost: number;
  couponCode?: string | null;
  couponDiscount: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    color?: string;
    size?: string;
  }>;
}

export interface PaginatedOrders {
  items: StoreOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
