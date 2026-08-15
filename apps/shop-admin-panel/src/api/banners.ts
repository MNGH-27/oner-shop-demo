import { apiRequest } from './client'
import type { Banner, BannerPayload } from '../types/banner'
export const fetchBanners = () => apiRequest<Banner[]>('/admin/banners')
export const createBanner = (payload: BannerPayload) => apiRequest<Banner>('/admin/banners', { method: 'POST', body: JSON.stringify(payload) })
export const updateBanner = (id: string, payload: Partial<BannerPayload>) => apiRequest<Banner>(`/admin/banners/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteBanner = (id: string) => apiRequest<void>(`/admin/banners/${id}`, { method: 'DELETE' })
