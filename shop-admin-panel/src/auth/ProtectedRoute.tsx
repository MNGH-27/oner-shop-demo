import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

function BootScreen() {
  return (
    <div className="grid min-h-screen place-content-center justify-items-center gap-3.5 text-muted">
      <div
        className="size-8 animate-spin rounded-full border-2 border-line border-t-accent"
        aria-hidden
      />
      <p className="m-0">در حال بارگذاری...</p>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <BootScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <BootScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
