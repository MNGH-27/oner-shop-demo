"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { CartSynchronizer } from "@components/modules/cart/CartSynchronizer";
import { AuthSynchronizer } from "@components/partials/providers/AuthSynchronizer";
export function AppProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSynchronizer />
      <CartSynchronizer />
      {children}
      <ToastContainer position="bottom-left" rtl theme="light" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
