import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { fetchSettings, updateSettings } from '../api/settings'
import { Alert, PageHeader, Spinner } from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PriceInput } from '../components/ui/PriceInput'
import { formatPrice } from '../lib/labels'
import { settingsSchema, validationErrors, type FieldErrors } from '../lib/validation'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await fetchSettings()
      setValue(String(data.defaultShippingCost))
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSettings({ defaultShippingCost: Number(value) || 0 }),
    onSuccess: async () => {
      setError(null)
      toast.success('هزینه ارسال پیش‌فرض ذخیره شد')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در ذخیره تنظیمات'
      setError(message)
      toast.error(message)
    },
  })

  if (settingsQuery.isLoading) return <Spinner />

  function submitSettings() {
    const errors = validationErrors(settingsSchema.safeParse({ defaultShippingCost: value }))
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    saveMutation.mutate()
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="تنظیمات"
        description="هزینه ارسال پیش‌فرض هنگام ساخت محصول جدید روی کالا ست می‌شود و بعداً قابل تغییر است."
      />

      {settingsQuery.isError ? (
        <Alert>
          {settingsQuery.error instanceof ApiError
            ? settingsQuery.error.message
            : 'خطا در دریافت تنظیمات'}
        </Alert>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <Field label="هزینه ارسال پیش‌فرض (تومان)" error={fieldErrors.defaultShippingCost}>
              <PriceInput
                value={value}
                onValueChange={setValue}
                aria-invalid={Boolean(fieldErrors.defaultShippingCost)}
              />
            </Field>
            {value !== '' ? (
              <p className="mt-2 mb-0 text-sm text-muted">
                نمایش: {formatPrice(Number(value) || 0)}
              </p>
            ) : null}
            {error ? (
              <div className="mt-3">
                <Alert>{error}</Alert>
              </div>
            ) : null}
            <Button
              type="button"
              className="mt-4"
              disabled={saveMutation.isPending}
              onClick={submitSettings}
            >
              {saveMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mt-0 mb-2 text-base font-semibold">اعلان تلگرام</h2>
            <p className="m-0 text-sm leading-7 text-muted">
              برای اعلان موجودی کم، در{' '}
              <code className="rounded bg-bg-soft px-1.5 py-0.5 text-xs" dir="ltr">
                .env
              </code>{' '}
              بک‌اند این مقادیر را ست کنید:{' '}
              <code className="rounded bg-bg-soft px-1.5 py-0.5 text-xs" dir="ltr">
                TELEGRAM_BOT_TOKEN
              </code>
              ،{' '}
              <code className="rounded bg-bg-soft px-1.5 py-0.5 text-xs" dir="ltr">
                TELEGRAM_CHAT_ID
              </code>
              ، و در ایران حتماً{' '}
              <code className="rounded bg-bg-soft px-1.5 py-0.5 text-xs" dir="ltr">
                TELEGRAM_PROXY
              </code>{' '}
              (مثلاً{' '}
              <code className="rounded bg-bg-soft px-1.5 py-0.5 text-xs" dir="ltr">
                http://127.0.0.1:7890
              </code>{' '}
              از Clash/V2Ray). روی هر محصول هم «آستانه اعلان موجودی» را وارد کنید.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
