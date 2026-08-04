import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOrdersStats } from '../api/orders'
import { fetchUsersStats } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { PageHeader, Spinner, StatCard } from '../components/ui/Page'
import { formatPrice, orderStatusLabels } from '../lib/labels'

const shortcuts = [
  { to: '/orders', label: 'سفارشات' },
  { to: '/products', label: 'محصولات' },
  { to: '/categories', label: 'دسته‌بندی‌ها' },
  { to: '/users', label: 'کاربران' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const name = user?.firstName || 'ادمین'

  const ordersStats = useQuery({
    queryKey: ['orders-stats'],
    queryFn: fetchOrdersStats,
  })

  const usersStats = useQuery({
    queryKey: ['users-stats'],
    queryFn: fetchUsersStats,
  })

  const loading = ordersStats.isLoading || usersStats.isLoading

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={`سلام، ${name}`}
        description="خلاصه وضعیت فروشگاه و دسترسی سریع به بخش‌ها"
      />

      {loading ? <Spinner /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="کل سفارشات"
          value={(ordersStats.data?.totalOrders ?? 0).toLocaleString('fa-IR')}
        />
        <StatCard
          label="درآمد پرداخت‌شده"
          value={formatPrice(ordersStats.data?.paidRevenue ?? 0)}
        />
        <StatCard
          label="سفارشات در انتظار"
          value={(ordersStats.data?.byStatus.pending ?? 0).toLocaleString('fa-IR')}
        />
        <StatCard
          label="کاربران فعال"
          value={(usersStats.data?.active ?? 0).toLocaleString('fa-IR')}
        />
      </div>

      {ordersStats.data ? (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-3 mt-0 text-base font-semibold">وضعیت سفارشات</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(orderStatusLabels) as Array<keyof typeof orderStatusLabels>).map(
              (key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-bg-soft px-3 py-2 text-sm"
                >
                  <span className="text-muted">{orderStatusLabels[key]}</span>
                  <strong>
                    {(ordersStats.data.byStatus[key] ?? 0).toLocaleString('fa-IR')}
                  </strong>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 mt-0 text-base font-semibold">دسترسی سریع</h2>
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to}>
              <Button type="button" variant="secondary" size="sm">
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
        {/*
          TODO(telegram-notify): نمایش وضعیت اعلان تلگرام (اختیاری در UI)
          نوتیف سفارش جدید از بک‌اند به بات تلگرام ارسال می‌شود؛ اینجا بعداً
          می‌توان وضعیت اتصال بات / آخرین اعلان را نشان داد.
        */}
      </section>
    </div>
  )
}
