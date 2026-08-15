import type { MongoId, PaginationQuery } from './common'
import type { CategoryRef } from './category'

export type ProductSizeType = 'letter' | 'dimension'

export interface ProductColor {
  name: string
  hex?: string
}

export interface ProductSize {
  label: string
  widthCm?: number
  lengthCm?: number
}

export interface ProductVariant {
  color?: string
  size?: string
  stock: number
  lowStockThreshold?: number | null
}

export interface Product {
  _id: MongoId
  name: string
  description?: string
  descriptionHtml?: string
  price: number
  discountPercent: number
  shippingCost: number
  images: string[]
  category: MongoId | CategoryRef
  stock: number
  colors: ProductColor[]
  sizeType: ProductSizeType
  sizes: ProductSize[]
  variants: ProductVariant[]
  relatedProducts?: Array<string | { _id: string; name: string; images?: string[] }>
  /** وقتی موجودی به این عدد برسد، اعلان تلگرام ارسال می‌شود */
  lowStockThreshold?: number | null
  isActive: boolean
  attributes: Record<string, string | number | boolean>
  createdAt: string
  updatedAt: string
}

export interface CreateProductPayload {
  name: string
  description?: string
  descriptionHtml?: string
  price?: number
  discountPercent?: number
  shippingCost?: number
  images?: string[]
  category: MongoId
  stock?: number
  colors?: ProductColor[]
  sizeType?: ProductSizeType
  sizes?: ProductSize[]
  lowStockThreshold?: number | null
  isActive?: boolean
  attributes?: Record<string, string | number | boolean>
  relatedProducts?: string[]
}

export interface UpdateProductPayload {
  name?: string
  description?: string
  descriptionHtml?: string
  images?: string[]
  category?: MongoId
  shippingCost?: number
  discountPercent?: number
  colors?: ProductColor[]
  sizeType?: ProductSizeType
  sizes?: ProductSize[]
  lowStockThreshold?: number | null
  isActive?: boolean
  attributes?: Record<string, string | number | boolean>
  relatedProducts?: string[]
}

export interface UpdateProductPricePayload {
  price: number
}

export interface SetProductStockPayload {
  stock: number
  lowStockThreshold?: number | null
}

export interface SetProductVariantsPayload {
  variants: ProductVariant[]
}

export interface ProductsQuery extends PaginationQuery {
  category?: MongoId
  search?: string
  onlyActive?: boolean
}

export interface ShopSettings {
  defaultShippingCost: number
}
