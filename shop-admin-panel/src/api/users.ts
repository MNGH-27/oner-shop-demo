import type { Paginated } from '../types/common'
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UsersQuery,
  UsersStats,
} from '../types/user'
import { apiRequest } from './client'
import { buildQuery, toQuery } from '../lib/query'

export function fetchUsers(query: UsersQuery = {}) {
  return apiRequest<Paginated<User>>(`/admin/users${buildQuery(toQuery(query))}`)
}

export function fetchUsersStats() {
  return apiRequest<UsersStats>('/admin/users/stats')
}

export function fetchUser(id: string) {
  return apiRequest<User>(`/admin/users/${id}`)
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<User>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiRequest<User>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function setUserActive(id: string, isActive: boolean) {
  return apiRequest<User>(`/admin/users/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export function deleteUser(id: string) {
  return apiRequest<void>(`/admin/users/${id}`, { method: 'DELETE' })
}
