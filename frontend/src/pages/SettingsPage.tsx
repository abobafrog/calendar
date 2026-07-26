import {
  Bell,
  ChevronRight,
  Clock3,
  Copy,
  Globe2,
  Moon,
  ShieldCheck,
  Sun,
  SunMoon,
} from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { ModalSheet } from '../components/ModalSheet'
import { Toast } from '../components/Toast'
import { UserAvatar } from '../components/UserAvatar'
import { useTheme } from '../hooks/useTheme'
import { useCurrentUser, useUpdateCurrentUser } from '../api/hooks'
import { formatLocalClockTime } from '../lib/time'
import type { ThemeMode, User } from '../lib/types'

const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'telegram', label: 'Telegram', icon: SunMoon },
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'contrast', label: 'Контраст', icon: ShieldCheck },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [toast, setToast] = useState<string | null>(null)
  const [sheet, setSheet] = useState<'timezone' | 'workday' | 'format' | null>(null)
  const currentUserQuery = useCurrentUser()
  const updateUser = useUpdateCurrentUser()
  const queryClient = useQueryClient()
  const currentUser = currentUserQuery.data
  if (!currentUser) return <div className="page loading-state">Загружаем профиль…</div>
  const saveUser = async (payload: Partial<User>, message: string) => {
    await updateUser.mutateAsync(payload)
    await queryClient.invalidateQueries({ queryKey: ['me'] })
    setSheet(null)
    setToast(message)
  }
  const workdayStart = (currentUser.workday_start ?? '09:00').slice(0, 5)
  const workdayEnd = (currentUser.workday_end ?? '18:00').slice(0, 5)
  const timeFormat = currentUser.time_format ?? '24h'
  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Предпочтения</span>
          <h1>Профиль</h1>
        </div>
      </header>
      <GlassPanel className="profile-panel">
        <UserAvatar user={currentUser} size="lg" status />
        <div>
          <h2>
            {currentUser.first_name} {currentUser.last_name}
          </h2>
          <span>@{currentUser.username}</span>
        </div>
        <GlassButton
          variant="icon"
          aria-label="Скопировать код"
          onClick={() => {
            void navigator.clipboard?.writeText(currentUser.invite_code ?? '')
            setToast('Код скопирован')
          }}
        >
          <Copy size={18} />
        </GlassButton>
      </GlassPanel>
      <section className="settings-section">
        <h2>Оформление</h2>
        <div className="theme-selector">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={theme === value ? 'is-active' : ''}
              onClick={() => setTheme(value)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2>Время</h2>
        <GlassPanel className="settings-list">
          <button type="button" onClick={() => setSheet('timezone')}>
            <Globe2 size={19} />
            <span>
              <strong>Часовой пояс</strong>
              <small>{currentUser.timezone}</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button type="button" onClick={() => setSheet('workday')}>
            <Clock3 size={19} />
            <span>
              <strong>Рабочее время</strong>
              <small>
                {formatLocalClockTime(workdayStart, timeFormat)} —{' '}
                {formatLocalClockTime(workdayEnd, timeFormat)}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button type="button" onClick={() => setSheet('format')}>
            <SunMoon size={19} />
            <span>
              <strong>Формат времени</strong>
              <small>
                {timeFormat === '12h' ? '12 часов' : '24 часа'} · неделя с{' '}
                {currentUser.week_starts_on === 7 ? 'воскресенья' : 'понедельника'}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
        </GlassPanel>
      </section>
      <section className="settings-section">
        <h2>Приватность</h2>
        <GlassPanel className="settings-list">
          <label className="toggle-row">
            <Bell size={19} />
            <span>
              <strong>Уведомления</strong>
              <small>Приглашения и встречи</small>
            </span>
            <input
              type="checkbox"
              checked={currentUser.notifications_enabled ?? true}
              onChange={(event) => {
                void saveUser(
                  { notifications_enabled: event.target.checked },
                  event.target.checked ? 'Уведомления включены' : 'Уведомления выключены',
                )
              }}
            />
            <i />
          </label>
          <button
            type="button"
            onClick={() => setToast('В MVP видимость выбирается при создании каждого интервала.')}
          >
            <ShieldCheck size={19} />
            <span>
              <strong>Видимость по умолчанию</strong>
              <small>Приватно</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </GlassPanel>
      </section>
      <p className="settings-note">
        Доступ к календарю есть только у принятых друзей. Скрытые интервалы используются лишь для
        расчёта свободного времени.
      </p>
      <SettingsSheet
        sheet={sheet}
        timezone={currentUser.timezone ?? 'UTC'}
        workdayStart={workdayStart}
        workdayEnd={workdayEnd}
        timeFormat={timeFormat}
        weekStartsOn={currentUser.week_starts_on ?? 1}
        saving={updateUser.isPending}
        onClose={() => setSheet(null)}
        onSave={saveUser}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function SettingsSheet({
  sheet,
  timezone,
  workdayStart,
  workdayEnd,
  timeFormat,
  weekStartsOn,
  saving,
  onClose,
  onSave,
}: {
  sheet: 'timezone' | 'workday' | 'format' | null
  timezone: string
  workdayStart: string
  workdayEnd: string
  timeFormat: '12h' | '24h'
  weekStartsOn: number
  saving: boolean
  onClose: () => void
  onSave: (payload: Partial<User>, message: string) => Promise<void>
}) {
  const [zone, setZone] = useState(timezone)
  const [start, setStart] = useState(workdayStart)
  const [end, setEnd] = useState(workdayEnd)
  const [format, setFormat] = useState<'12h' | '24h'>(timeFormat)
  const [weekStart, setWeekStart] = useState(weekStartsOn)
  const title =
    sheet === 'timezone' ? 'Часовой пояс' : sheet === 'workday' ? 'Рабочее время' : 'Формат времени'
  return (
    <ModalSheet open={sheet !== null} title={title} onClose={onClose}>
      {sheet === 'timezone' && (
        <div className="sheet-form">
          <label className="field">
            <span>IANA timezone</span>
            <select value={zone} onChange={(event) => setZone(event.target.value)}>
              {[
                'UTC',
                'Europe/Moscow',
                'Europe/Amsterdam',
                'Asia/Tbilisi',
                'Asia/Dubai',
                'America/New_York',
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <GlassButton
            disabled={saving}
            onClick={() => void onSave({ timezone: zone }, 'Часовой пояс сохранён')}
          >
            Сохранить
          </GlassButton>
        </div>
      )}
      {sheet === 'workday' && (
        <div className="sheet-form">
          <div className="field-row field-row--two">
            <label className="field">
              <span>Начало</span>
              <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="field">
              <span>Конец</span>
              <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>
          <GlassButton
            disabled={saving}
            onClick={() =>
              void onSave({ workday_start: start, workday_end: end }, 'Рабочее время сохранено')
            }
          >
            Сохранить
          </GlassButton>
        </div>
      )}
      {sheet === 'format' && (
        <div className="sheet-form">
          <div className="segmented-control segmented-control--wide">
            <button
              type="button"
              className={format === '24h' ? 'is-active' : ''}
              onClick={() => setFormat('24h')}
            >
              24 часа
            </button>
            <button
              type="button"
              className={format === '12h' ? 'is-active' : ''}
              onClick={() => setFormat('12h')}
            >
              12 часов
            </button>
          </div>
          <div className="segmented-control segmented-control--wide">
            <button
              type="button"
              className={weekStart === 1 ? 'is-active' : ''}
              onClick={() => setWeekStart(1)}
            >
              Пн
            </button>
            <button
              type="button"
              className={weekStart === 7 ? 'is-active' : ''}
              onClick={() => setWeekStart(7)}
            >
              Вс
            </button>
          </div>
          <GlassButton
            disabled={saving}
            onClick={() =>
              void onSave(
                { time_format: format, week_starts_on: weekStart },
                'Формат времени сохранён',
              )
            }
          >
            Сохранить
          </GlassButton>
        </div>
      )}
    </ModalSheet>
  )
}
