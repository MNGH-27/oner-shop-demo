"use client";

import { ChevronDown, Filter } from "lucide-react";
import { useState } from "react";

export function ProductFilters({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`filters ${open ? "mobile-open" : ""}`}>
      <button
        type="button"
        className="mobile-filter-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="product-filter-options"
      >
        <span>
          <Filter size={18} /> فیلتر محصولات
        </span>
        <small>{open ? "بستن" : "نمایش گزینه‌ها"}</small>
        <ChevronDown size={16} />
      </button>
      <div id="product-filter-options" className="filter-body">
        <h2>
          <Filter size={18} /> فیلتر محصولات
        </h2>
        {children}
      </div>
    </aside>
  );
}
