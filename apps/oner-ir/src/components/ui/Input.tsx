import type { InputHTMLAttributes } from "react";
import { cn } from "@core/utils/cn.utils";
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}
