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
import { useState } from "react";
import { SearchDialog } from "@components/modules/search/SearchDialog";
import { getCategoryTree } from "@core/services/api/shop.api";
import {
  selectCartCount,
  useCartStore,
} from "@core/services/stores/cart.store";
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
        <Link
          href={`/products?category=${category._id}`}
          onClick={closeMenu}
        >
          {category.name}
        </Link>
      </li>
    );
  }

  return (
    <li className={`category-branch ${open ? "open" : ""}`}>
      <div className="category-parent-row">
        <Link
          href={`/products?category=${category._id}`}
          onClick={closeMenu}
        >
          {category.name}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`نمایش زیرمجموعه‌های ${category.name}`}
        >
          {depth === 0 ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
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
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const categories = useQuery({
    queryKey: ["catalog-category-tree"],
    queryFn: getCategoryTree,
    staleTime: 300000,
  });
  const closeMenu = () => setMenu(false);

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
          <span className="logo-star">✦</span>
          <b>oner</b>
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
          <div className="categories-nav">
            <button type="button">
              دسته‌بندی‌ها <ChevronDown size={14} />
            </button>
            <ul className="categories-mega">
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
          <Link href="/profile" aria-label="حساب کاربری">
            <UserRound size={19} />
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
