import { buildQuery, toQuery } from '../lib/query'
import type { Paginated } from '../types/common'
import type {
  CreateProductPayload,
  Product,
  ProductsQuery,
  SetProductStockPayload,
  SetProductVariantsPayload,
  UpdateProductPayload,
  UpdateProductPricePayload,
} from '../types/product'
import { apiRequest } from './client'

export function fetchProducts(query: ProductsQuery = {}) {
  return apiRequest<Paginated<Product>>(
    `/admin/products${buildQuery(toQuery(query))}`,
  )
}

export function fetchProduct(id: string) {
  return apiRequest<Product>(`/admin/products/${id}`)
}

export function createProduct(payload: CreateProductPayload) {
  return apiRequest<Product>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProduct(id: string, payload: UpdateProductPayload) {
  return apiRequest<Product>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateProductPrice(id: string, payload: UpdateProductPricePayload) {
  return apiRequest<Product>(`/admin/products/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function setProductStock(id: string, payload: SetProductStockPayload) {
  return apiRequest<Product>(`/admin/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function setProductVariants(id: string, payload: SetProductVariantsPayload) {
  return apiRequest<Product>(`/admin/products/${id}/variants`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteProduct(id: string) {
  return apiRequest<void>(`/admin/products/${id}`, { method: 'DELETE' })
}
