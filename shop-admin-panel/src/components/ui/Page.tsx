import type { ReactNode } from 'react'
import { Button } from './Button'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="m-0 text-2xl font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 mb-0 text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones = {
    neutral: 'bg-bg-soft text-muted',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-sky-50 text-sky-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Spinner({ label = 'در حال بارگذاری...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <div
        className="size-7 animate-spin rounded-full border-2 border-line border-t-accent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <h3 className="m-0 text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 mb-0 max-w-md text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger" role="alert">
      {children}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return (
      <div className="mt-4 text-sm text-muted">
        مجموع {total.toLocaleString('fa-IR')} مورد
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted">
        صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')} — مجموع{' '}
        {total.toLocaleString('fa-IR')}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          قبلی
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          بعدی
        </Button>
      </div>
    </div>
  )
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  )
}
