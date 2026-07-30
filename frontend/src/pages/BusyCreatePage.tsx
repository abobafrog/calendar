import { ArrowLeft, CalendarPlus, Check, Eye, LockKeyhole, Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useCurrentUser } from '../api/hooks'
import { DateSwitcher } from '../components/DateSwitcher'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { PaymentSheet } from '../components/PaymentSheet'
import type { PaymentMethod } from '../components/PaymentSheet'
import { formatLocalDateKey, fromLocalDateKey, toLocalDateKey } from '../lib/time'
import type { Visibility } from '../lib/types'

const dayOptions = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const timeOptions = Array.from({ length: 49 }, (_, index) => {
  const totalMinutes = index * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})
type TimeBlock = { start: string; end: string }

export function BusyCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const today = toLocalDateKey(new Date())
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [blocks, setBlocks] = useState<TimeBlock[]>([{ start: '10:00', end: '11:00' }])
  const [days, setDays] = useState<number[]>([fromLocalDateKey(today).getDay() || 7])
  const [visibility, setVisibility] = useState<Visibility>(
    () => currentUser.data?.default_visibility ?? 'closed',
  )
  const [saving, setSaving] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const selectedDate = fromLocalDateKey(date)
  const weekStart = startOfWeek(selectedDate)
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const next = new Date(weekStart)
    next.setDate(weekStart.getDate() + index)
    return next
  })
  const canSave =
    days.length > 0 && blocks.every(({ start, end }) => timeToMinutes(start) < timeToMinutes(end))

  const save = async (paymentMethod: PaymentMethod) => {
    if (!canSave || saving) return
    const base = fromLocalDateKey(date)
    const intervals = days.flatMap((day) =>
      blocks.map(({ start, end }) => {
        const next = new Date(base)
        const delta = day - (base.getDay() || 7)
        next.setDate(base.getDate() + delta)
        const startAt = makeLocalDateTime(next, start)
        const endAt = makeLocalDateTime(next, end)
        return {
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          title: title || null,
          visibility,
        }
      }),
    )
    try {
      setSaving(true)
      await apiRequest('/calendar/intervals/bulk', {
        method: 'POST',
        body: JSON.stringify({ intervals, payment_method: paymentMethod }),
      })
      await queryClient.invalidateQueries({ queryKey: ['calendar'], refetchType: 'all' })
    } catch (error) {
      throw error instanceof Error ? error : new Error('Не удалось сохранить занятость')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page form-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Новая занятость</h1>
        <GlassButton
          variant="icon"
          onClick={() => setPaymentOpen(true)}
          disabled={!canSave || saving}
          aria-label="Перейти к оплате"
        >
          <Check size={19} />
        </GlassButton>
      </header>
      <GlassPanel className="form-section selection-preview">
        <div>
          <CalendarPlus size={20} />
          <span>Выбранные интервалы</span>
        </div>
        <strong>
          {blocks.length} · {blocks[0].start} — {blocks[0].end}
        </strong>
      </GlassPanel>
      <GlassPanel className="form-section">
        <label className="field">
          <span>Название</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, фокус-время"
            maxLength={200}
          />
        </label>
        <div className="date-choice">
          <span>Дата недели</span>
          <DateSwitcher
            date={selectedDate}
            onChange={(next) => {
              setDate(toLocalDateKey(next))
              setDays([next.getDay() || 7])
            }}
          />
          <div className="week-strip week-strip--compact">
            {weekDates.map((item, index) => {
              const key = toLocalDateKey(item)
              const active = key === date
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? 'is-active' : ''}
                  onClick={() => {
                    setDate(key)
                    setDays([index + 1])
                  }}
                >
                  <span>{dayOptions[index]}</span>
                  <strong>{item.getDate()}</strong>
                </button>
              )
            })}
          </div>
          <small>{formatLocalDateKey(date)}</small>
        </div>
        <div className="interval-list">
          {blocks.map((block, index) => (
            <div className="field-row" key={`${index}-${block.start}`}>
              <label className="field">
                <span>Начало {index + 1}</span>
                <select
                  value={block.start}
                  onChange={(event) =>
                    setBlocks((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, start: event.target.value } : item,
                      ),
                    )
                  }
                >
                  {timeOptions.slice(0, -1).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Конец</span>
                <select
                  value={block.end}
                  onChange={(event) =>
                    setBlocks((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, end: event.target.value } : item,
                      ),
                    )
                  }
                >
                  {timeOptions.slice(1).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
              {blocks.length > 1 && (
                <GlassButton
                  variant="icon"
                  aria-label="Удалить интервал"
                  onClick={() =>
                    setBlocks((items) => items.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Trash2 size={17} />
                </GlassButton>
              )}
            </div>
          ))}
        </div>
        <GlassButton
          type="button"
          onClick={() => setBlocks((items) => [...items, { start: '14:00', end: '15:00' }])}
        >
          <Plus size={17} />
          Добавить интервал
        </GlassButton>
      </GlassPanel>
      <GlassPanel className="form-section">
        <div className="form-label">
          <span>Повторить в дни</span>
          <small>можно выбрать несколько</small>
        </div>
        <div className="day-picker">
          {dayOptions.map((label, index) => {
            const value = index + 1
            const active = days.includes(value)
            return (
              <button
                key={label}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() =>
                  setDays(active ? days.filter((item) => item !== value) : [...days, value])
                }
              >
                {active && <Check size={12} />}
                {label}
              </button>
            )
          })}
        </div>
      </GlassPanel>
      <GlassPanel className="form-section">
        <div className="form-label">
          <span>Показывать друнам</span>
        </div>
        <div className="visibility-options">
          <button
            type="button"
            className={visibility === 'open' ? 'is-active' : ''}
            onClick={() => setVisibility('open')}
          >
            <Eye size={19} />
            <span>
              <strong>Да, показать дело</strong>
              <small>Друны увидят название и время</small>
            </span>
          </button>
          <button
            type="button"
            className={visibility === 'closed' ? 'is-active' : ''}
            onClick={() => setVisibility('closed')}
          >
            <LockKeyhole size={19} />
            <span>
              <strong>Нет, скрыть детали</strong>
              <small>Друны увидят только «Занят»</small>
            </span>
          </button>
        </div>
      </GlassPanel>
      <GlassButton
        variant="primary"
        className="sticky-submit"
        onClick={() => setPaymentOpen(true)}
        disabled={!canSave || saving}
      >
        Перейти к оплате · 99 ₽
      </GlassButton>
      <PaymentSheet
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onConfirmed={save}
        onSuccess={() => navigate('/', { replace: true })}
      />
    </div>
  )
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  next.setHours(0, 0, 0, 0)
  return next
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function makeLocalDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}
