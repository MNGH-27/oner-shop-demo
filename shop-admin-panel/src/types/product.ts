import type { MongoId, PaginationQuery } from './common'
import type { CategoryRef } from './category'

export interface Product {
  _id: MongoId
  name: string
  description?: string
  price: number
  shippingCost: number
  images: string[]
  category: MongoId | CategoryRef
  stock: number
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
  price?: number
  shippingCost?: number
  images?: string[]
  category: MongoId
  stock?: number
  lowStockThreshold?: number | null
  isActive?: boolean
  attributes?: Record<string, string | number | boolean>
}

export interface UpdateProductPayload {
  name?: string
  description?: string
  images?: string[]
  category?: MongoId
  shippingCost?: number
  lowStockThreshold?: number | null
  isActive?: boolean
  attributes?: Record<string, string | number | boolean>
}

export interface UpdateProductPricePayload {
  price: number
}

export interface SetProductStockPayload {
  stock: number
  lowStockThreshold?: number | null
}

export interface ProductsQuery extends PaginationQuery {
  category?: MongoId
  search?: string
  onlyActive?: boolean
}

export interface ShopSettings {
  defaultShippingCost: number
}
