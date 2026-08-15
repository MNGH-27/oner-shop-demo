import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:opacity-70',
  secondary:
    'border border-line bg-surface text-ink hover:bg-bg-soft disabled:opacity-70',
  danger:
    'bg-danger text-white hover:bg-danger/90 disabled:opacity-70',
  ghost:
    'border border-line bg-transparent text-ink hover:bg-bg-soft disabled:opacity-70',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5',
} as const

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
