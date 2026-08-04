import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/', label: 'داشبورد', end: true },
  { to: '/orders', label: 'سفارشات' },
  { to: '/products', label: 'محصولات' },
  { to: '/categories', label: 'دسته‌بندی‌ها' },
  { to: '/users', label: 'کاربران' },
  { to: '/settings', label: 'تنظیمات' },
] as const

const navLinkBase =
  'flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 font-medium transition-colors whitespace-nowrap'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : ''

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-line bg-surface p-4 lg:border-b-0 lg:border-l">
        <div className="flex items-center gap-3 border-b border-line px-2 pb-4">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-lg font-bold text-white">
            ش
          </span>
          <div>
            <strong className="block text-base">فروشگاه</strong>
            <span className="block text-sm text-muted">پنل مدیریت</span>
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">{displayName}</span>
            {user?.email ? (
              <span className="truncate text-sm text-muted">{user.email}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-2.5 font-semibold transition-colors hover:bg-bg-soft"
            onClick={logout}
          >
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
