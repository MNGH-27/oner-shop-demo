import type { InputHTMLAttributes } from 'react'
import { Input } from './Field'

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

export function PriceInput({
  value,
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string | number
  onValueChange: (rawValue: string) => void
}) {
  const rawValue = String(value ?? '')
  const formatted = rawValue === '' ? '' : Number(rawValue).toLocaleString('en-US')

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={formatted}
      onChange={(event) => {
        const raw = normalizeDigits(event.target.value).replace(/[^\d]/g, '')
        onValueChange(raw)
      }}
    />
  )
}
