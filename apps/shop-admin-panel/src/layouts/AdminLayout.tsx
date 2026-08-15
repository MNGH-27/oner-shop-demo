import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ui/Icon'

const navItems = [
  { to: '/', label: 'داشبورد', icon: 'dashboard', end: true },
  { to: '/orders', label: 'سفارش‌ها', icon: 'orders' },
  { to: '/products', label: 'محصولات', icon: 'products' },
  { to: '/categories', label: 'دسته‌بندی‌ها', icon: 'categories' },
  { to: '/banners', label: 'بنرهای سایت', icon: 'banners' },
  { to: '/coupons', label: 'کدهای تخفیف', icon: 'coupons' },
  { to: '/users', label: 'کاربران', icon: 'users' },
  { to: '/settings', label: 'تنظیمات فروشگاه', icon: 'settings' },
] as const

const navLinkBase =
  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-colors whitespace-nowrap'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : ''

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-line bg-surface p-4 lg:border-b-0 lg:border-l">
        <div className="flex items-center gap-3 border-b border-line px-2 pb-4">
          <span className="oner-mark">oner<span>✦</span></span>
          <div>
            <strong className="block text-base">Oner</strong>
            <span className="block text-xs text-muted">مدیریت فروشگاه</span>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="منوی اصلی">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-ink hover:bg-bg-soft'
                }`
              }
            >
              <Icon name={item.icon} className="size-[19px] shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">{displayName}</span>
            {user?.phone || user?.email ? (
              <span className="truncate text-sm text-muted">{user.phone || user.email}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-2.5 font-semibold transition-colors hover:bg-bg-soft"
            onClick={logout}
          >
            <Icon name="logout" className="ml-2 size-[18px]" />
            خروج
          </button>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
