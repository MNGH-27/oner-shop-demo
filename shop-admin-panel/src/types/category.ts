import type { MongoId, PaginationQuery } from './common'

export interface CategoryRef {
  _id: MongoId
  name: string
}

export interface Category {
  _id: MongoId
  name: string
  description?: string
  image?: string
  parent: MongoId | CategoryRef | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryTreeNode extends Omit<Category, 'parent'> {
  parent: MongoId | null
  children: CategoryTreeNode[]
}

export interface CreateCategoryPayload {
  name: string
  description?: string
  image?: string
  parent?: MongoId | null
  isActive?: boolean
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

export interface CategoriesQuery extends PaginationQuery {
  onlyActive?: boolean
  search?: string
  parent?: MongoId
}
