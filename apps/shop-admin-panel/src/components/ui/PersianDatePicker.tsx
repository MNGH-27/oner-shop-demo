import DatePickerModule, { type DateObject } from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import 'react-multi-date-picker/styles/colors/teal.css'

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-right text-ink outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20'

// این پکیج CommonJS است و در Vite گاهی default export را داخل یک object برمی‌گرداند.
const DatePicker = (
  (DatePickerModule as unknown as { default?: typeof DatePickerModule }).default ??
  DatePickerModule
) as typeof DatePickerModule

function asLocalDate(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12)
}

export function PersianDatePicker({
  value,
  onChange,
  invalid,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  return (
    <DatePicker
      value={asLocalDate(value)}
      onChange={(date: DateObject | null) => {
        if (!date) {
          onChange('')
          return
        }
        const selected = date.toDate()
        const year = selected.getFullYear()
        const month = String(selected.getMonth() + 1).padStart(2, '0')
        const day = String(selected.getDate()).padStart(2, '0')
        onChange(`${year}-${month}-${day}`)
      }}
      calendar={persian}
      locale={persianFa}
      format="YYYY/MM/DD"
      minDate={new Date()}
      editable={false}
      placeholder="انتخاب تاریخ انقضا"
      calendarPosition="bottom-right"
      containerClassName="w-full"
      inputClass={`${inputClass} ${invalid ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`}
      className="teal"
    />
  )
}
