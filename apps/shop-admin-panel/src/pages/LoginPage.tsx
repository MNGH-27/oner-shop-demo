import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ui/Icon'
import { loginSchema, validationErrors, type FieldErrors } from '../lib/validation'

const fieldClass = 'flex flex-col gap-1.5'
const labelClass = 'text-sm font-medium'
const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const validation = loginSchema.safeParse({ email: email.trim(), password })
    const errors = validationErrors(validation)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      return
    }
    setLoading(true)

    try {
      await login({ email: email.trim(), password })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? 'ایمیل یا رمز عبور نادرست است.'
            : err.message,
        )
      } else {
        setError('ارتباط با سرور برقرار نشد.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-[430px] rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_70px_rgba(50,45,37,0.09)] sm:p-9">
        <div className="mb-8 flex items-center gap-4 border-b border-line pb-6">
          <span className="oner-mark oner-mark-login">ONER</span>
          <div>
            <h1 className="m-0 text-[1.35rem] font-bold">پنل مدیریت <span className="brand-name">ONER</span></h1>
            <p className="mt-1 mb-0 text-sm text-muted">
              برای ادامه وارد حساب ادمین شوید
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <label className={fieldClass}>
            <span className={labelClass}>ایمیل</span>
            <input
              className={inputClass}
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@shop.local"
              required
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? <span className="text-xs font-medium text-danger">{fieldErrors.email}</span> : null}
          </label>

          <label className={fieldClass}>
            <span className={labelClass}>رمز عبور</span>
            <input
              className={inputClass}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? <span className="text-xs font-medium text-danger">{fieldErrors.password}</span> : null}
          </label>

          {error ? (
            <div
              className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {!loading ? <Icon name="lock" className="ml-2 size-[18px]" /> : null}
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        {/*
          TODO(phone-login): UI ورود با شماره همراه
          بعداً تب/سوئیچ «ورود با موبایل» اینجا اضافه شود (ارسال کد + تأیید OTP).
          لاگین ادمین فعلاً ایمیل/رمز است؛ OTP بیشتر برای مشتریان سایت Next.js است،
          ولی اگر ادمین هم موبایل خواست، همین صفحه نقطهٔ شروع UI است.
        */}
      </div>
    </div>
  )
}
