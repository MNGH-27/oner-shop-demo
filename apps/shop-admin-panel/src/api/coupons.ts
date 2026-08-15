import { apiRequest } from './client'
export interface Coupon { _id: string; code: string; percent: number; minimumAmount: number; maximumDiscountAmount: number; isActive: boolean; expiresAt?: string }
export type CouponPayload = Omit<Coupon, '_id'>
export const fetchCoupons = () => apiRequest<Coupon[]>('/admin/coupons')
export const createCoupon = (payload: CouponPayload) => apiRequest<Coupon>('/admin/coupons', { method: 'POST', body: JSON.stringify(payload) })
export const updateCoupon = (id: string, payload: Partial<CouponPayload>) => apiRequest<Coupon>(`/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteCoupon = (id: string) => apiRequest<void>(`/admin/coupons/${id}`, { method: 'DELETE' })
