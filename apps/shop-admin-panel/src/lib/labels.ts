import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../types/common'

export const roleLabels: Record<UserRole, string> = {
  admin: 'ادمین',
  customer: 'مشتری',
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  failed: 'ناموفق',
  refunded: 'بازگشت وجه',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  online: 'پرداخت آنلاین',
}

export function formatPrice(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return `${new Intl.NumberFormat('en-US').format(amount)} تومان`
}

export function formatDate(value?: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatPersianDateFull(value?: string): string {
  if (!value) return 'برای داده قدیمی ثبت نشده'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'تاریخ نامعتبر'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(Number.isFinite(value) ? value : 0)
}
