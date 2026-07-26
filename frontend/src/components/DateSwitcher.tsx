import { ChevronLeft, ChevronRight } from 'lucide-react'

const format = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

export function DateSwitcher({
  date,
  onChange,
  label,
  step = 'day',
}: {
  date: Date
  onChange: (date: Date) => void
  label?: string
  step?: 'day' | 'week' | 'month'
}) {
  const shift = (days: number) => {
    const next = new Date(date)
    if (step === 'month') next.setMonth(next.getMonth() + days)
    else if (step === 'week') next.setDate(next.getDate() + days * 7)
    else next.setDate(next.getDate() + days)
    onChange(next)
  }
  return (
    <div className="date-switcher">
      <button type="button" onClick={() => shift(-1)} aria-label="Предыдущий день">
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="date-switcher__label" onClick={() => onChange(new Date())}>
        {label ?? format.format(date)}
      </button>
      <button type="button" onClick={() => shift(1)} aria-label="Следующий день">
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
