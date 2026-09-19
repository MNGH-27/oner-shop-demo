"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SearchDialog } from "@components/modules/search/SearchDialog";
import { getCategoryTree } from "@core/services/api/shop.api";
import {
  selectCartCount,
  useCartStore,
} from "@core/services/stores/cart.store";
import { useAuthStore } from "@core/services/stores/auth.store";
import type { StoreCategoryNode } from "@core/types/shop.types";

function CategoryItem({
  category,
  closeMenu,
  depth = 0,
}: {
  category: StoreCategoryNode;
  closeMenu: () => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = category.children?.length > 0;

  if (!hasChildren) {
    return (
      <li>
        <Link href={`/products?category=${category._id}`} onClick={closeMenu}>
          {category.name}
        </Link>
      </li>
    );
  }

  return (
    <li className={`category-branch ${open ? "open" : ""}`}>
      <div className="category-parent-row">
        <Link href={`/products?category=${category._id}`} onClick={closeMenu}>
          {category.name}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`نمایش زیرمجموعه‌های ${category.name}`}
        >
          {depth === 0 ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <ul className="category-submenu">
        {category.children.map((child) => (
          <CategoryItem
            key={child._id}
            category={child}
            closeMenu={closeMenu}
            depth={depth + 1}
          />
        ))}
      </ul>
    </li>
  );
}

export function SiteHeader() {
  const count = useCartStore(selectCartCount);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [menu, setMenu] = useState(false);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [search, setSearch] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const categories = useQuery({
    queryKey: ["catalog-category-tree"],
    queryFn: getCategoryTree,
    staleTime: 300000,
  });
  const closeMenu = () => {
    setMenu(false);
    setCategoryMenu(false);
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!categoriesRef.current?.contains(event.target as Node)) {
        setCategoryMenu(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <>
      <div className="announce">
        ارسال به سراسر ایران · دوخت با عشق برای آرامش کودک
      </div>
      <header className="site-header">
        <button
          type="button"
          className="mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-controls="main-navigation"
          aria-label={menu ? "بستن منو" : "باز کردن منو"}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <Link href="/" className="logo" onClick={closeMenu}>
          <b>ONER</b>
        </Link>
        <nav
          id="main-navigation"
          className={menu ? "main-nav open" : "main-nav"}
        >
          <Link href="/" onClick={closeMenu}>
            خانه
          </Link>
          <Link href="/products" onClick={closeMenu}>
            فروشگاه
          </Link>
          <div
            ref={categoriesRef}
            className={`categories-nav ${categoryMenu ? "open" : ""}`}
          >
            <button
              type="button"
              onClick={() => setCategoryMenu((current) => !current)}
              aria-expanded={categoryMenu}
            >
              دسته‌بندی‌ها <ChevronDown size={14} />
            </button>
            <ul className="categories-mega">
              <li className="category-menu-heading">
                <div>
                  <b>دسته‌بندی محصولات</b>
                  <small>کالای خواب و پوشاک کودک</small>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryMenu(false)}
                  aria-label="بستن دسته‌بندی‌ها"
                >
                  <X size={17} />
                </button>
              </li>
              <li className="category-view-all">
                <Link href="/products" onClick={closeMenu}>
                  مشاهده همه محصولات
                </Link>
              </li>
              {categories.isLoading ? (
                <li className="category-loading">
                  در حال دریافت دسته‌بندی‌ها...
                </li>
              ) : (
                categories.data?.map((category) => (
                  <CategoryItem
                    key={category._id}
                    category={category}
                    closeMenu={closeMenu}
                  />
                ))
              )}
            </ul>
          </div>
          <Link href="/contact" onClick={closeMenu}>
            تماس با ما
          </Link>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            onClick={() => setSearch(true)}
            aria-label="جست‌وجو"
          >
            <Search size={19} />
          </button>
          <Link
            href="/profile"
            className={`auth-link ${hydrated && token ? "authenticated" : "guest"}`}
            aria-label={hydrated && token ? "حساب کاربری" : "ورود یا ثبت‌نام"}
          >
            <UserRound size={18} />
            <span>
              {hydrated && token
                ? user?.firstName || "حساب من"
                : "ورود / ثبت‌نام"}
            </span>
          </Link>
          <Link href="/cart" className="header-cart" aria-label="سبد خرید">
            <ShoppingBag size={18} />
            <span>{count.toLocaleString("fa-IR")}</span>
          </Link>
        </div>
      </header>
      <SearchDialog open={search} onOpenChange={setSearch} />
    </>
  );
}
