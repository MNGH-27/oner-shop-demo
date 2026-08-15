import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const controlClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70'

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-danger" role="alert">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${props['aria-invalid'] ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-24 resize-y ${props['aria-invalid'] ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${props['aria-invalid'] ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`} {...props} />
}
