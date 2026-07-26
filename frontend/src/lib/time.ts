import type { User } from './types'

export type TimeFormat = NonNullable<User['time_format']>

export function formatTimeInZone(
  value: string,
  timezone = 'Europe/Moscow',
  timeFormat: TimeFormat = '24h',
) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(value))
}

export function formatLocalClockTime(value: string, timeFormat: TimeFormat = '24h') {
  const [rawHours, rawMinutes] = value.split(':')
  const hours = Number(rawHours)
  const minutes = rawMinutes?.padStart(2, '0') ?? '00'
  if (timeFormat === '24h') return `${String(hours).padStart(2, '0')}:${minutes}`
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const twelveHour = hours % 12 || 12
  return `${twelveHour}:${minutes} ${suffix}`
}

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromLocalDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function formatLocalDateKey(value: string) {
  return fromLocalDateKey(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateInZone(value: string, timezone = 'Europe/Moscow') {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}
