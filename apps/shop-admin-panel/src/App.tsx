import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";

const BannersPage = lazy(() =>
  import("./pages/BannersPage").then((module) => ({
    default: module.BannersPage,
  })),
);
const CategoriesPage = lazy(() =>
  import("./pages/CategoriesPage").then((module) => ({
    default: module.CategoriesPage,
  })),
);
const CouponsPage = lazy(() =>
  import("./pages/CouponsPage").then((module) => ({
    default: module.CouponsPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const OrderDetailPage = lazy(() =>
  import("./pages/OrderDetailPage").then((module) => ({
    default: module.OrderDetailPage,
  })),
);
const OrdersPage = lazy(() =>
  import("./pages/OrdersPage").then((module) => ({
    default: module.OrdersPage,
  })),
);
const ProductsPage = lazy(() =>
  import("./pages/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((module) => ({ default: module.UsersPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex min-h-64 items-center justify-center text-sm text-muted">
                در حال بارگذاری…
              </div>
            }
          >
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
                  <Route
                    path="products/new"
                    element={<ProductsPage editorMode="create" />}
                  />
                  <Route
                    path="products/:productId/edit"
                    element={<ProductsPage editorMode="edit" />}
                  />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        <Toaster
          position="bottom-left"
          dir="rtl"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "font-[Vazirmatn,Tahoma,sans-serif]",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
