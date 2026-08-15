"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [value, setValue] = useState(""); const router = useRouter();
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!value.trim()) return; onOpenChange(false); router.push(`/products?search=${encodeURIComponent(value.trim())}`) };
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="search-overlay"/><Dialog.Content className="search-dialog"><Dialog.Title>جست‌وجو در Oner</Dialog.Title><Dialog.Close aria-label="بستن"><X/></Dialog.Close><form onSubmit={submit}><Search/><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="نام محصول یا دسته‌بندی..."/><button>جست‌وجو</button></form></Dialog.Content></Dialog.Portal></Dialog.Root>
}
