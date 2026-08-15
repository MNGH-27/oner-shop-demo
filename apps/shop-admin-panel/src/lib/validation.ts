import { z } from 'zod'

const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} الزامی است.`).max(max, `${label} نباید بیشتر از ${max} کاراکتر باشد.`)

const numericString = (label: string, options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {}) =>
  z.string().trim().superRefine((value, ctx) => {
    if (!value && options.optional) return
    if (!value) return ctx.addIssue({ code: 'custom', message: `${label} الزامی است.` })
    const number = Number(value)
    if (!Number.isFinite(number)) return ctx.addIssue({ code: 'custom', message: `${label} باید عدد معتبر باشد.` })
    if (options.integer && !Number.isInteger(number)) ctx.addIssue({ code: 'custom', message: `${label} باید عدد صحیح باشد.` })
    if (options.min !== undefined && number < options.min) ctx.addIssue({ code: 'custom', message: `${label} نمی‌تواند کمتر از ${options.min} باشد.` })
    if (options.max !== undefined && number > options.max) ctx.addIssue({ code: 'custom', message: `${label} نمی‌تواند بیشتر از ${options.max} باشد.` })
  })

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'ایمیل الزامی است.').email('فرمت ایمیل معتبر نیست.'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.').max(128, 'رمز عبور بیش از حد طولانی است.'),
})

export const userSchema = (editing: boolean) => z.object({
  firstName: requiredText('نام', 60),
  lastName: requiredText('نام خانوادگی', 80),
  phone: z.string().trim().regex(/^09\d{9}$/, 'شماره همراه باید با 09 شروع شود و ۱۱ رقم باشد.'),
  password: editing
    ? z.string().refine((value) => !value || value.length >= 6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.').refine((value) => value.length <= 128, 'رمز عبور بیش از حد طولانی است.')
    : z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.').max(128, 'رمز عبور بیش از حد طولانی است.'),
  role: z.enum(['admin', 'customer'], { message: 'نقش کاربر معتبر نیست.' }),
})

export const categorySchema = z.object({
  name: requiredText('نام دسته‌بندی', 100),
  description: z.string().trim().max(2000, 'توضیحات نباید بیشتر از ۲۰۰۰ کاراکتر باشد.'),
}).superRefine((data, ctx) => {
  if (data.name.length < 2) ctx.addIssue({ code: 'custom', path: ['name'], message: 'نام دسته‌بندی باید حداقل ۲ کاراکتر باشد.' })
})

export const bannerSchema = z.object({
  title: requiredText('عنوان بنر', 120),
  subtitle: z.string().trim().max(250, 'زیرعنوان نباید بیشتر از ۲۵۰ کاراکتر باشد.'),
  image: z.string().trim().min(1, 'انتخاب تصویر بنر الزامی است.'),
})

export const couponSchema = z.object({
  code: z.string().trim().min(3, 'کد تخفیف باید حداقل ۳ کاراکتر باشد.').max(30, 'کد تخفیف نباید بیشتر از ۳۰ کاراکتر باشد.').regex(/^[A-Z0-9_-]+$/i, 'کد تخفیف فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.'),
  percent: z.number().int('درصد باید عدد صحیح باشد.').min(1, 'درصد باید حداقل ۱ باشد.').max(100, 'درصد نمی‌تواند بیشتر از ۱۰۰ باشد.'),
  minimumAmount: z.number().finite().min(0, 'حداقل خرید نمی‌تواند منفی باشد.'),
  maximumDiscountAmount: z.number().finite().min(1, 'سقف مبلغ تخفیف الزامی است و باید بیشتر از صفر باشد.'),
  expiresAt: z.string().trim().min(1, 'تاریخ انقضا الزامی است.').refine((value) => !Number.isNaN(Date.parse(value)), 'تاریخ انقضا معتبر نیست.'),
})

export const productSchema = (editing: boolean) => z.object({
  name: requiredText('نام محصول', 160),
  description: z.string().trim().max(5000, 'توضیحات نباید بیشتر از ۵۰۰۰ کاراکتر باشد.'),
  descriptionHtml: z.string().max(30000, 'توضیحات کامل بیش از حد طولانی است.'),
  category: z.string().trim().min(1, 'انتخاب دسته‌بندی الزامی است.'),
  images: z.array(z.string()).min(1, 'حداقل یک تصویر برای محصول انتخاب کنید.').max(10, 'حداکثر ۱۰ تصویر مجاز است.'),
  price: numericString('قیمت', { min: 0, integer: true, optional: editing }),
  shippingCost: numericString('هزینه ارسال', { min: 0, integer: true }),
  discountPercent: numericString('درصد تخفیف', { min: 0, max: 100, integer: true }),
  lowStockThreshold: numericString('آستانه اعلان موجودی', { min: 0, integer: true, optional: true }),
  colors: z.array(z.string().trim().min(1)).min(1, 'حداقل یک رنگ اضافه کنید.'),
  sizes: z.array(z.string().trim().min(1)).min(1, 'حداقل یک سایز اضافه کنید.'),
})

export const priceSchema = z.object({ price: numericString('قیمت', { min: 0, integer: true }) })
export const stockSchema = z.object({
  stock: numericString('موجودی', { min: 0, integer: true }),
  lowStockThreshold: numericString('آستانه اعلان موجودی', { min: 0, integer: true, optional: true }),
})
export const settingsSchema = z.object({ defaultShippingCost: numericString('هزینه ارسال', { min: 0, integer: true }) })
export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], { message: 'یک وضعیت معتبر انتخاب کنید.' }),
  notes: z.string().trim().max(1000, 'یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد.'),
})

export function validationMessage(result: z.ZodSafeParseResult<unknown>): string | null {
  return result.success ? null : result.error.issues[0]?.message ?? 'اطلاعات واردشده معتبر نیست.'
}

export type FieldErrors = Record<string, string>

export function validationErrors(result: z.ZodSafeParseResult<unknown>): FieldErrors {
  if (result.success) return {}
  return result.error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? '_form')
    if (!errors[field]) errors[field] = issue.message
    return errors
  }, {})
}
