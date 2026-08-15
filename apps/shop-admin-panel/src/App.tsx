import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute'
import { AdminLayout } from './layouts/AdminLayout'
import { CategoriesPage } from './pages/CategoriesPage'
import { BannersPage } from './pages/BannersPage'
import { CouponsPage } from './pages/CouponsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="banners" element={<BannersPage />} />
                <Route path="coupons" element={<CouponsPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/new" element={<ProductsPage editorMode="create" />} />
                <Route path="products/:productId/edit" element={<ProductsPage editorMode="edit" />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        <Toaster
          position="bottom-left"
          dir="rtl"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'font-[Vazirmatn,Tahoma,sans-serif]',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
