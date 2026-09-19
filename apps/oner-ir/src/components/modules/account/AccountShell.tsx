"use client";

import {
  LogOut,
  MapPin,
  PackageOpen,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@core/services/stores/auth.store";

const links = [
  { href: "/profile", label: "پروفایل", icon: UserRound, exact: true },
  { href: "/profile/addresses", label: "نشانی‌ها", icon: MapPin },
  { href: "/profile/orders", label: "سفارش‌ها", icon: PackageOpen },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) {
    return (
      <div className="account-page account-page-guest">
        <header className="account-hero">
          <span className="eyebrow">حساب <span className="brand-name">ONER</span></span>
          <h1>حساب کاربری</h1>
          <p>برای مدیریت مشخصات، نشانی‌ها و سفارش‌ها وارد شوید.</p>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="account-page">
      <header className="account-hero">
        <span className="eyebrow">حساب <span className="brand-name">ONER</span></span>
        <h1>
          سلام، {user.firstName || <>همراه <span className="brand-name">ONER</span></>}
        </h1>
        <p>اطلاعات حساب، نشانی‌ها و سفارش‌های شما در یک فضای منظم.</p>
      </header>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity">
            <span className="account-avatar">
              <UserRound size={22} />
            </span>
            <div>
              <b>{`${user.firstName} ${user.lastName}`.trim()}</b>
              <small dir="ltr">{user.phone}</small>
            </div>
          </div>
          <nav aria-label="بخش‌های حساب کاربری">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={active ? "active" : ""}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="account-logout"
            onClick={() => {
              logout();
              router.push("/profile");
            }}
          >
            <LogOut size={17} /> خروج از حساب
          </button>
        </aside>
        <main className="account-content">{children}</main>
      </div>
    </div>
  );
}
