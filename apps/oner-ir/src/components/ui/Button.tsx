import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@core/utils/cn.utils";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--ink)] text-white hover:bg-[var(--brown)]",
        outline:
          "border border-[var(--line)] bg-white hover:border-[var(--ink)]",
        ghost: "bg-transparent hover:bg-black/5",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "min-h-12 px-6 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
