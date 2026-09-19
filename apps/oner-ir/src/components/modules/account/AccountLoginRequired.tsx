"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuthStore } from "@core/services/stores/auth.store";

export function AccountLoginRequired({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user) return children;
  return (
    <section className="account-login-required">
      <LockKeyhole size={38} />
      <h2>ابتدا وارد حساب شوید</h2>
      <p>این بخش فقط برای صاحب حساب قابل مشاهده است.</p>
      <Link className="primary-btn" href="/profile">
        ورود / ثبت‌نام
      </Link>
    </section>
  );
}
