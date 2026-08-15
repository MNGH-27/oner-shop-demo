import type { AuthResponse, AuthUser, LoginPayload } from '../types/auth'
import { entityId } from '../lib/id'
import { apiRequest } from './client'

function normalizeAuthUser(user: AuthUser & { _id?: string }): AuthUser {
  return {
    id: entityId(user),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
  }
}

export async function loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    accessToken: result.accessToken,
    user: normalizeAuthUser(result.user),
  }
}

export async function getAdminMe(): Promise<AuthUser> {
  const user = await apiRequest<AuthUser & { _id?: string }>('/admin/auth/me')
  return normalizeAuthUser(user)
}

/*
 * TODO(phone-login): ورود با شماره همراه (OTP)
 * محل پیاده‌سازی فرانت ادمین (در صورت نیاز ادمین به لاگین موبایل):
 *   - تابع‌هایی مثل requestOtp(phone) و verifyOtp(phone, code)
 *   - endpointهای پیشنهادی بک‌اند: POST /admin/auth/otp/request و POST /admin/auth/otp/verify
 * لاگین اصلی مشتریان فروشگاه (سایت Next.js) جدا از این پنل است و OTP آنجا اولویت دارد.
 */
