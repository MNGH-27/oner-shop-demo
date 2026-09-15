import type { MongoId, PaginationQuery, UserRole } from './common'

export interface Address {
  title: string
  fullName: string
  phone: string
  province: string
  city: string
  addressLine: string
  postalCode: string
  isActive?: boolean
  isDefault: boolean
}

export interface User {
  _id: MongoId
  id?: MongoId
  email: string
  firstName: string
  lastName: string
  fullName?: string
  phone?: string
  role: UserRole
  isActive: boolean
  addresses?: Address[]
  createdAt: string
  updatedAt: string
}

export interface UsersStats {
  total: number
  active: number
  inactive: number
  byRole: {
    admin: number
    customer: number
  }
}

export interface CreateUserPayload {
  email?: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role?: UserRole
  isActive?: boolean
}

export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
  isActive?: boolean
  password?: string
}

export interface UsersQuery extends PaginationQuery {
  role?: UserRole
  search?: string
  isActive?: boolean
}
