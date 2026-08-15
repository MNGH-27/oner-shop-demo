import { apiRequest } from './client'
import type { ShopSettings } from '../types/product'

export function fetchSettings() {
  return apiRequest<ShopSettings>('/admin/settings')
}

export function updateSettings(payload: ShopSettings) {
  return apiRequest<ShopSettings>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
