import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { createCoupon, deleteCoupon, fetchCoupons, updateCoupon, type Coupon } from '../api/coupons'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PersianDatePicker } from '../components/ui/PersianDatePicker'
import { PriceInput } from '../components/ui/PriceInput'
import { PageHeader, Spinner } from '../components/ui/Page'
import { formatPersianDateFull, formatPrice } from '../lib/labels'
import { couponSchema, validationErrors, type FieldErrors } from '../lib/validation'

type CouponForm = {
  code: string
  percent: number
  minimumAmount: string
  maximumDiscountAmount: string
  isActive: boolean
  expiresAt: string
}

const emptyForm: CouponForm = {
  code: '',
  percent: 10,
  minimumAmount: '0',
  maximumDiscountAmount: '',
  isActive: true,
  expiresAt: '',
}

export function CouponsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CouponForm>(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const query = useQuery({ queryKey: ['coupons'], queryFn: fetchCoupons })
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        minimumAmount: Number(form.minimumAmount),
        maximumDiscountAmount: Number(form.maximumDiscountAmount),
      }
      return editing ? updateCoupon(editing, payload) : createCoupon(payload)
    },
    onSuccess: async () => {
      toast.success(editing ? 'کد تخفیف ویرایش شد' : 'کد تخفیف اضافه شد')
      closeModal()
      await queryClient.invalidateQueries({ queryKey: ['coupons'] })
    },
    onError: () => toast.error('ذخیره کد انجام نشد'),
  })
  const remove = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: async () => {
      toast.success('کد حذف شد')
      await queryClient.invalidateQueries({ queryKey: ['coupons'] })
    },
  })

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(item: Coupon) {
    setEditing(item._id)
    setForm({
      code: item.code,
      percent: item.percent,
      minimumAmount: String(item.minimumAmount),
      maximumDiscountAmount: item.maximumDiscountAmount ? String(item.maximumDiscountAmount) : '',
      isActive: item.isActive,
      expiresAt: item.expiresAt?.slice(0, 10) ?? '',
    })
    setFieldErrors({})
    setModalOpen(true)
  }

  function submitCoupon() {
    const errors = validationErrors(couponSchema.safeParse({
      ...form,
      minimumAmount: Number(form.minimumAmount),
      maximumDiscountAmount: Number(form.maximumDiscountAmount),
    }))
    setFieldErrors(errors)
    if (!Object.keys(errors).length) save.mutate()
  }

  if (query.isLoading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="کدهای تخفیف"
        description="درصد، حداقل خرید، سقف مبلغ تخفیف و تاریخ انقضا را مدیریت کنید."
        action={<Button onClick={openCreate}>کد تخفیف جدید</Button>}
      />
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <article key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <b className="text-lg" dir="ltr">{item.code}</b>
                <span className={`rounded-lg border px-3 py-1 text-sm font-extrabold ${item.isActive ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <p className="m-0 text-sm text-muted">
                {item.percent.toLocaleString('fa-IR')}٪ · حداقل {formatPrice(item.minimumAmount)} · سقف تخفیف {item.maximumDiscountAmount ? formatPrice(item.maximumDiscountAmount) : 'برای داده قدیمی ثبت نشده'}
              </p>
              <p className="m-0 text-sm font-bold text-ink">
                تاریخ انقضا: {formatPersianDateFull(item.expiresAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>ویرایش</Button>
              <Button size="sm" variant="danger" onClick={() => remove.mutate(item._id)}>حذف</Button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}
        onClose={closeModal}
        wide
        footer={<><Button variant="ghost" onClick={closeModal}>انصراف</Button><Button onClick={submitCoupon} disabled={save.isPending}>{save.isPending ? 'در حال ذخیره...' : 'ذخیره کد تخفیف'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="کد تخفیف" error={fieldErrors.code}>
            <Input aria-invalid={Boolean(fieldErrors.code)} dir="ltr" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
          </Field>
          <Field label="درصد تخفیف" error={fieldErrors.percent}>
            <Input aria-invalid={Boolean(fieldErrors.percent)} type="number" min={1} max={100} value={form.percent} onChange={(event) => setForm({ ...form, percent: Number(event.target.value) })} />
          </Field>
          <Field label="حداقل مبلغ خرید" error={fieldErrors.minimumAmount}>
            <PriceInput aria-invalid={Boolean(fieldErrors.minimumAmount)} value={form.minimumAmount} onValueChange={(minimumAmount) => setForm({ ...form, minimumAmount })} />
          </Field>
          <Field label="سقف مبلغ تخفیف" hint="وارد کردن مبلغ بیشتر از صفر الزامی است." error={fieldErrors.maximumDiscountAmount}>
            <PriceInput aria-invalid={Boolean(fieldErrors.maximumDiscountAmount)} value={form.maximumDiscountAmount} onValueChange={(maximumDiscountAmount) => setForm({ ...form, maximumDiscountAmount })} />
          </Field>
          <Field label="تاریخ انقضا" hint={form.expiresAt ? `نمایش: ${formatPersianDateFull(form.expiresAt)}` : 'انتخاب تاریخ انقضا الزامی است.'} error={fieldErrors.expiresAt}>
            <PersianDatePicker
              value={form.expiresAt}
              onChange={(expiresAt) => setForm({ ...form, expiresAt })}
              invalid={Boolean(fieldErrors.expiresAt)}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            کد تخفیف فعال باشد
          </label>
        </div>
      </Modal>
    </div>
  )
}
