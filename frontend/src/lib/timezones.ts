export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'Всемирное время' },
  { value: 'Europe/Moscow', label: 'Москва' },
  { value: 'Europe/Kaliningrad', label: 'Калининград' },
  { value: 'Europe/Amsterdam', label: 'Амстердам' },
  { value: 'Europe/Berlin', label: 'Берлин' },
  { value: 'Europe/London', label: 'Лондон' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси' },
  { value: 'Asia/Dubai', label: 'Дубай' },
  { value: 'Asia/Almaty', label: 'Алматы' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск' },
  { value: 'America/New_York', label: 'Нью-Йорк' },
  { value: 'America/Chicago', label: 'Чикаго' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес' },
]

export function timezoneOptionsWithCurrent(current: string) {
  return TIMEZONE_OPTIONS.some((item) => item.value === current)
    ? TIMEZONE_OPTIONS
    : [{ value: current, label: 'Часовой пояс устройства' }, ...TIMEZONE_OPTIONS]
}

export function timezoneLabel(value: string) {
  return TIMEZONE_OPTIONS.find((item) => item.value === value)?.label ?? 'Часовой пояс устройства'
}
