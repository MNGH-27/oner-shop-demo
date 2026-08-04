import { buildQuery, toQuery } from '../lib/query'
import type { Paginated } from '../types/common'
import type {
  CategoriesQuery,
  Category,
  CategoryTreeNode,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category'
import { apiRequest } from './client'

export function fetchCategories(query: CategoriesQuery = {}) {
  return apiRequest<Paginated<Category>>(
    `/admin/categories${buildQuery(toQuery(query))}`,
  )
}

export function fetchCategoryTree(onlyActive = false) {
  return apiRequest<CategoryTreeNode[]>(
    `/admin/categories/tree${buildQuery({ onlyActive: onlyActive ? 'true' : undefined })}`,
  )
}

export function fetchCategory(id: string) {
  return apiRequest<Category>(`/admin/categories/${id}`)
}

export function createCategory(payload: CreateCategoryPayload) {
  return apiRequest<Category>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCategory(id: string, payload: UpdateCategoryPayload) {
  return apiRequest<Category>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteCategory(id: string) {
  return apiRequest<void>(`/admin/categories/${id}`, { method: 'DELETE' })
}
