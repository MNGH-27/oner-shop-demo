import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchOrders, fetchOrdersStats } from '../api/orders'
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
  TableShell,
} from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { entityId } from '../lib/id'
import { formatDate, formatPrice, orderStatusLabels } from '../lib/labels'
import type { OrderStatus } from '../types/common'
import type { Order } from '../types/order'

function statusTone(status: OrderStatus) {
  if (status === 'delivered') return 'success' as const
  if (status === 'cancelled') return 'danger' as const
  if (status === 'pending') return 'warning' as const
  return 'info' as const
}

function customerName(order: Order) {
  if (typeof order.user === 'string') return order.user
  return (
    order.user.fullName ||
    `${order.user.firstName} ${order.user.lastName}`.trim() ||
    order.user.phone ||
    order.user.email
  )
}

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  )

  const ordersQuery = useQuery({
    queryKey: ['orders', query],
    queryFn: () => fetchOrders(query),
  })

  const statsQuery = useQuery({
    queryKey: ['orders-stats'],
    queryFn: fetchOrdersStats,
  })

  return (
    <div>
      <PageHeader
        title="سفارشات"
        description="پیگیری وضعیت آماده‌سازی و ارسال سفارش‌ها"
      />

      {statsQuery.data ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="کل سفارشات"
            value={statsQuery.data.totalOrders.toLocaleString('fa-IR')}
          />
          <StatCard
            label="درآمد"
            value={formatPrice(statsQuery.data.paidRevenue)}
          />
          <StatCard
            label="در انتظار"
            value={(statsQuery.data.byStatus.pending ?? 0).toLocaleString('fa-IR')}
          />
          <StatCard
            label="تحویل‌شده"
            value={(statsQuery.data.byStatus.delivered ?? 0).toLocaleString('fa-IR')}
          />
        </div>
      ) : null}

      {/*
        TODO(telegram-notify): بعداً اینجا می‌توان وضعیت اتصال بات تلگرام
        یا آخرین اعلان سفارش را نشان داد.
      */}

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-3 lg:items-end">
        <Field label="شماره سفارش">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ORD-..."
          />
        </Field>
        <Field label="وضعیت سفارش">
          <Select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value as OrderStatus | '')
            }}
          >
            <option value="">همه</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
        >
          اعمال فیلتر
        </Button>
      </div>

      {ordersQuery.isLoading ? <Spinner /> : null}
      {ordersQuery.isError ? (
        <Alert>
          {ordersQuery.error instanceof ApiError
            ? ordersQuery.error.message
            : 'خطا در دریافت سفارشات'}
        </Alert>
      ) : null}

      {ordersQuery.data && ordersQuery.data.items.length === 0 ? (
        <EmptyState
          title="سفارشی ثبت نشده"
          description="سفارش‌های ثبت‌شده مشتریان در این بخش نمایش داده می‌شوند."
        />
      ) : null}

      {ordersQuery.data && ordersQuery.data.items.length > 0 ? (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line bg-bg-soft/60 text-right">
                <th className="px-4 py-3 font-semibold">شماره</th>
                <th className="px-4 py-3 font-semibold">مشتری</th>
                <th className="px-4 py-3 font-semibold">مبلغ</th>
                <th className="px-4 py-3 font-semibold">وضعیت</th>
                <th className="px-4 py-3 font-semibold">تاریخ</th>
                <th className="px-4 py-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.data.items.map((order) => {
                const id = entityId(order)
                return (
                  <tr key={id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3">{customerName(order)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(order.status)}>
                        {orderStatusLabels[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/orders/${id}`}>
                        <Button type="button" variant="ghost" size="sm">
                          جزئیات
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableShell>
          <Pagination
            page={ordersQuery.data.meta.page}
            totalPages={ordersQuery.data.meta.totalPages}
            total={ordersQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  )
}
