import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import {
  fetchOrder,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from '../api/orders'
import { mediaUrl } from '../api/uploads'
import { Alert, Badge, PageHeader, Spinner, TableShell } from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field, Select, Textarea } from '../components/ui/Field'
import {
  formatDate,
  formatPrice,
  orderStatusLabels,
  paymentStatusLabels,
} from '../lib/labels'
import type { OrderStatus, PaymentStatus } from '../types/common'
import { orderStatusSchema, validationErrors, type FieldErrors } from '../lib/validation'

function statusTone(status: OrderStatus) {
  if (status === 'delivered') return 'success' as const
  if (status === 'cancelled') return 'danger' as const
  if (status === 'pending') return 'warning' as const
  return 'info' as const
}

const nextOrderStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

const nextPaymentStatuses: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  failed: ['pending', 'paid'],
  refunded: [],
}

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id),
  })

  const statusMutation = useMutation({
    mutationFn: () =>
      updateOrderStatus(id, {
        status: status as OrderStatus,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async (order) => {
      setError(null)
      setStatus('')
      setNotes(order.notes ?? '')
      toast.success('وضعیت سفارش بروزرسانی شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', id] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders-stats'] }),
      ])
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در بروزرسانی وضعیت'
      setError(message)
      toast.error(message)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      updateOrderPaymentStatus(id, {
        paymentStatus: paymentStatus as PaymentStatus,
      }),
    onSuccess: async () => {
      setPaymentStatus('')
      setError(null)
      toast.success('وضعیت پرداخت بروزرسانی شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', id] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders-stats'] }),
      ])
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در بروزرسانی پرداخت'
      setError(message)
      toast.error(message)
    },
  })

  if (orderQuery.isLoading) return <Spinner />
  if (orderQuery.isError) {
    return (
      <Alert>
        {orderQuery.error instanceof ApiError
          ? orderQuery.error.message
          : 'سفارش پیدا نشد'}
      </Alert>
    )
  }

  const order = orderQuery.data
  if (!order) return null

  function submitStatus() {
    const errors = validationErrors(orderStatusSchema.safeParse({ status, notes }))
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    statusMutation.mutate()
  }

  const customer =
    typeof order.user === 'string'
      ? { name: order.user, phone: '' }
      : {
          name:
            order.user.fullName ||
            `${order.user.firstName} ${order.user.lastName}`.trim(),
          phone: order.user.phone ?? '',
        }

  const allowedStatuses = nextOrderStatuses[order.status]
  const allowedPaymentStatuses: PaymentStatus[] =
    order.status === 'cancelled'
      ? order.paymentStatus === 'paid'
        ? ['refunded']
        : []
      : nextPaymentStatuses[order.paymentStatus]
  const locked = allowedStatuses.length === 0

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link to="/orders" className="text-sm text-accent hover:underline">
          بازگشت به سفارشات
        </Link>
      </div>

      <PageHeader
        title={order.orderNumber}
        description={`ثبت‌شده در ${formatDate(order.createdAt)}`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={statusTone(order.status)}>
          {orderStatusLabels[order.status]}
        </Badge>
        <Badge tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
          {paymentStatusLabels[order.paymentStatus]}
        </Badge>
      </div>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-3 mt-0 text-base font-semibold">مشتری و ارسال</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">نام</dt>
              <dd className="m-0 font-medium">{customer.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">موبایل مشتری</dt>
              <dd className="m-0" dir="ltr">
                {customer.phone || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">تلفن گیرنده</dt>
              <dd className="m-0" dir="ltr">
                {order.shippingAddress.phone}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">گیرنده</dt>
              <dd className="m-0">{order.shippingAddress.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">آدرس</dt>
              <dd className="m-0 text-left">
                {order.shippingAddress.province}، {order.shippingAddress.city}،{' '}
                {order.shippingAddress.addressLine}
                {order.shippingAddress.postalCode
                  ? ` — ${order.shippingAddress.postalCode}`
                  : ''}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-3 mt-0 text-base font-semibold">مبالغ</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">جمع اقلام</dt>
              <dd className="m-0">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">هزینه ارسال</dt>
              <dd className="m-0">{formatPrice(order.shippingCost)}</dd>
            </div>
            {order.couponDiscount ? (
              <div className="flex justify-between gap-3 text-success">
                <dt>تخفیف {order.couponCode ?? ''}</dt>
                <dd className="m-0">− {formatPrice(order.couponDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-line pt-2">
              <dt className="font-semibold">جمع کل</dt>
              <dd className="m-0 font-bold">{formatPrice(order.totalAmount)}</dd>
            </div>
            {order.notes ? (
              <div className="mt-2 rounded-xl bg-bg-soft p-3 text-muted">
                یادداشت: {order.notes}
              </div>
            ) : null}
            {order.deliveredAt ? (
              <div className="text-muted">تحویل: {formatDate(order.deliveredAt)}</div>
            ) : null}
            {order.cancelledAt ? (
              <div className="text-muted">لغو: {formatDate(order.cancelledAt)}</div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="mb-5">
        <h2 className="mb-3 text-base font-semibold">اقلام سفارش</h2>
        <TableShell>
          <thead>
            <tr className="border-b border-line bg-bg-soft/60 text-right">
              <th className="px-4 py-3 font-semibold">کالا</th>
              <th className="px-4 py-3 font-semibold">قیمت واحد</th>
              <th className="px-4 py-3 font-semibold">تعداد</th>
              <th className="px-4 py-3 font-semibold">جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.product}-${index}`} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={mediaUrl(item.image)}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    ) : null}
                    <div>
                      <span className="font-medium">{item.name}</span>
                      {item.color || item.size ? (
                        <div className="mt-1 text-xs text-muted">
                          {item.color ? `رنگ: ${item.color}` : ''}
                          {item.color && item.size ? ' — ' : ''}
                          {item.size ? `سایز: ${item.size}` : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{formatPrice(item.price)}</td>
                <td className="px-4 py-3">{item.quantity.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-3">
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 mt-0 text-base font-semibold">تغییر وضعیت سفارش</h2>
        {locked ? (
          <p className="m-0 text-sm text-muted">
            این سفارش نهایی شده و وضعیت آن قابل تغییر نیست.
          </p>
        ) : (
          <div className="grid max-w-xl gap-3">
            <Field label="وضعیت جدید" error={fieldErrors.status}>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
                aria-invalid={Boolean(fieldErrors.status)}
              >
                <option value="">انتخاب کنید</option>
                {allowedStatuses.map((value) => (
                  <option key={value} value={value}>
                    {orderStatusLabels[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="یادداشت (اختیاری)" error={fieldErrors.notes}>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={order.notes || ''}
                aria-invalid={Boolean(fieldErrors.notes)}
              />
            </Field>
            <Button
              type="button"
              disabled={!status || statusMutation.isPending}
              onClick={submitStatus}
            >
              {statusMutation.isPending ? 'در حال ذخیره...' : 'بروزرسانی وضعیت'}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 mt-0 text-base font-semibold">وضعیت پرداخت</h2>
        {allowedPaymentStatuses.length ? (
          <div className="grid max-w-xl gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="وضعیت جدید">
              <Select
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value as PaymentStatus | '')
                }
              >
                <option value="">انتخاب کنید</option>
                {allowedPaymentStatuses.map((value) => (
                  <option key={value} value={value}>
                    {paymentStatusLabels[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="button"
              disabled={!paymentStatus || paymentMutation.isPending}
              onClick={() => paymentMutation.mutate()}
            >
              {paymentMutation.isPending ? 'در حال ذخیره...' : 'ثبت وضعیت پرداخت'}
            </Button>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">وضعیت پرداخت نهایی شده است.</p>
        )}
      </section>
    </div>
  )
}
