import {
  Bell,
  BedDouble,
  ChevronRight,
  Clock3,
  Copy,
  Edit2,
  Flag,
  Globe2,
  HandHeart,
  Heart,
  History,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  SunMoon,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { ModalSheet } from '../components/ModalSheet'
import { PaymentSheet } from '../components/PaymentSheet'
import type { PaymentMethod } from '../components/PaymentSheet'
import { Toast } from '../components/Toast'
import { UserAvatar } from '../components/UserAvatar'
import { useTheme } from '../hooks/useTheme'
import {
  useCreateDonation,
  useCurrentUser,
  usePaymentSummary,
  useUpdateCurrentUser,
} from '../api/hooks'
import { formatLocalClockTime } from '../lib/time'
import { timezoneLabel, timezoneOptionsWithCurrent } from '../lib/timezones'
import type { HolidayCategory, ThemeMode, User } from '../lib/types'
import { signOut } from '../api/client'

const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'contrast', label: 'Контраст', icon: ShieldCheck },
]

const holidayCategories: {
  value: HolidayCategory
  label: string
  description: string
  icon: typeof Sun
}[] = [
  {
    value: 'Всемирный',
    label: 'Всемирные',
    description: 'События мирового масштаба',
    icon: Globe2,
  },
  {
    value: 'Международный',
    label: 'Международные',
    description: 'Общие даты разных стран',
    icon: UsersRound,
  },
  {
    value: 'Национальный',
    label: 'Национальные',
    description: 'Праздники отдельных стран',
    icon: Flag,
  },
  {
    value: 'Религиозный',
    label: 'Религиозные',
    description: 'Памятные даты и дни святых',
    icon: Heart,
  },
  {
    value: 'Необычный',
    label: 'Необычные',
    description: 'Тематические и добрые поводы',
    icon: Sparkles,
  },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [toast, setToast] = useState<string | null>(null)
  const [sheet, setSheet] = useState<'profile' | 'timezone' | 'workday' | 'format' | null>(null)
  const [donationAmount, setDonationAmount] = useState('100')
  const [donationOpen, setDonationOpen] = useState(false)
  const currentUserQuery = useCurrentUser()
  const updateUser = useUpdateCurrentUser()
  const paymentSummaryQuery = usePaymentSummary()
  const createDonation = useCreateDonation()
  const queryClient = useQueryClient()
  const currentUser = currentUserQuery.data
  if (!currentUser) return <div className="page loading-state">Загружаем профиль…</div>
  const saveUser = async (payload: Partial<User>, message: string) => {
    await updateUser.mutateAsync(payload)
    await queryClient.invalidateQueries({ queryKey: ['me'] })
    setSheet(null)
    setToast(message)
  }
  const setNotificationsEnabled = async (enabled: boolean) => {
    let message = enabled ? 'Уведомления сайта включены' : 'Уведомления выключены'
    if (enabled && 'Notification' in window && window.Notification.permission === 'default') {
      const permission = await window.Notification.requestPermission()
      if (permission !== 'granted') {
        message = 'Внутренние уведомления включены, системные запрещены браузером'
      }
    }
    await saveUser({ notifications_enabled: enabled }, message)
  }
  const setHolidayCategoryEnabled = async (category: HolidayCategory, enabled: boolean) => {
    const current = currentUser.holiday_categories ?? holidayCategories.map((item) => item.value)
    const next = enabled
      ? [...current.filter((item) => item !== category), category]
      : current.filter((item) => item !== category)
    try {
      const updated = await updateUser.mutateAsync({ holiday_categories: next })
      queryClient.setQueryData(['me'], updated)
      await queryClient.invalidateQueries({ queryKey: ['holidays'] })
      setToast('Настройки праздников сохранены')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось сохранить настройки')
    }
  }
  const workdayStart = (currentUser.workday_start ?? '09:00').slice(0, 5)
  const workdayEnd = (currentUser.workday_end ?? '18:00').slice(0, 5)
  const timeFormat = currentUser.time_format ?? '24h'
  const donationValue = Number(donationAmount)
  const validDonation =
    Number.isInteger(donationValue) && donationValue >= 1 && donationValue <= 1_000_000
  const paymentSummary = paymentSummaryQuery.data
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
        <div className="profile-actions">
          <GlassButton
            variant="icon"
            aria-label="Редактировать профиль"
            onClick={() => setSheet('profile')}
          >
            <Edit2 size={18} />
          </GlassButton>
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
        </div>
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
              <small>{timezoneLabel(currentUser.timezone ?? 'UTC')}</small>
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
      <ComfortSettings user={currentUser} onSave={saveUser} saving={updateUser.isPending} />
      <section className="settings-section">
        <h2>Праздники в календаре</h2>
        <GlassPanel className="settings-list holiday-settings-list">
          {holidayCategories.map(({ value, label, description, icon: Icon }) => (
            <label className="toggle-row" key={value}>
              <Icon size={19} />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                checked={(
                  currentUser.holiday_categories ?? holidayCategories.map((item) => item.value)
                ).includes(value)}
                disabled={updateUser.isPending}
                onChange={(event) => {
                  void setHolidayCategoryEnabled(value, event.target.checked)
                }}
              />
              <i />
            </label>
          ))}
        </GlassPanel>
        <p className="holiday-settings-hint">
          Если отключить все категории, праздники в календаре показываться не будут.
        </p>
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
                void setNotificationsEnabled(event.target.checked)
              }}
            />
            <i />
          </label>
          <button type="button" onClick={() => navigate('/privacy')}>
            <ShieldCheck size={19} />
            <span>
              <strong>Центр приватности</strong>
              <small>Кто видит детали, временный доступ и режим по умолчанию</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </GlassPanel>
      </section>
      <InstallAppSection onMessage={setToast} />
      <section className="settings-section">
        <h2>Поддержка проекта</h2>
        <GlassPanel className="donation-panel">
          <div className="donation-total">
            <span>
              <HandHeart size={21} />
            </span>
            <div>
              <small>Всего потрачено</small>
              <strong>{formatRubles(paymentSummary?.total_amount ?? 0)} ₽</strong>
            </div>
          </div>
          <label className="field donation-amount">
            <span>Сумма пожертвования</span>
            <div>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                inputMode="numeric"
                value={donationAmount}
                onChange={(event) => setDonationAmount(event.target.value)}
              />
              <b>₽</b>
            </div>
            <small>От 1 до 1 000 000 рублей</small>
          </label>
          <GlassButton
            variant="primary"
            disabled={!validDonation || createDonation.isPending}
            onClick={() => setDonationOpen(true)}
          >
            <HandHeart size={18} />
            Пожертвовать
          </GlassButton>
        </GlassPanel>
        <GlassPanel className="payment-history">
          <div className="payment-history__header">
            <History size={18} />
            <strong>История расходов</strong>
          </div>
          {paymentSummaryQuery.isLoading ? (
            <p>Загружаем историю…</p>
          ) : paymentSummary?.payments.length ? (
            <div className="payment-history__list">
              {paymentSummary.payments.map((payment) => (
                <div key={payment.id}>
                  <span>
                    <strong>
                      {payment.purpose === 'donation' ? 'Пожертвование' : 'Создание занятости'}
                    </strong>
                    <small>
                      {new Date(payment.created_at).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {paymentMethodLabel(payment.method)}
                    </small>
                  </span>
                  <b>{formatRubles(payment.amount)} ₽</b>
                </div>
              ))}
            </div>
          ) : (
            <p>Пока расходов нет.</p>
          )}
        </GlassPanel>
      </section>
      <section className="settings-section">
        <h2>Аккаунт</h2>
        <GlassPanel className="settings-list">
          <button
            type="button"
            className="settings-logout"
            onClick={async () => {
              if (!window.confirm('Выйти из аккаунта на этом устройстве?')) return
              queryClient.clear()
              await signOut()
            }}
          >
            <LogOut size={19} />
            <span>
              <strong>Выйти из аккаунта</strong>
              <small>Для следующего входа понадобятся логин и пароль</small>
            </span>
          </button>
        </GlassPanel>
      </section>
      <p className="settings-note">
        Доступ к календарю есть только у принятых друнов. Если показ деталей включён, они увидят
        название дела; иначе — только статус «Занят».
      </p>
      <SettingsSheet
        key={`${sheet ?? 'closed'}-${currentUser.first_name}-${currentUser.last_name ?? ''}-${currentUser.username ?? ''}-${currentUser.timezone}`}
        sheet={sheet}
        timezone={currentUser.timezone ?? 'UTC'}
        firstName={currentUser.first_name}
        lastName={currentUser.last_name ?? ''}
        username={currentUser.username ?? ''}
        workdayStart={workdayStart}
        workdayEnd={workdayEnd}
        timeFormat={timeFormat}
        weekStartsOn={currentUser.week_starts_on ?? 1}
        saving={updateUser.isPending}
        onClose={() => setSheet(null)}
        onSave={saveUser}
      />
      <PaymentSheet
        open={donationOpen}
        purpose="donation"
        amount={validDonation ? donationValue : 1}
        onClose={() => setDonationOpen(false)}
        onConfirmed={async (method: PaymentMethod) => {
          await createDonation.mutateAsync({ amount: donationValue, method })
        }}
        onSuccess={() => {
          setDonationOpen(false)
          void queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] })
          setToast('Спасибо за поддержку!')
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function ComfortSettings({
  user,
  saving,
  onSave,
}: {
  user: User
  saving: boolean
  onSave: (payload: Partial<User>, message: string) => Promise<void>
}) {
  const [sleepStart, setSleepStart] = useState((user.sleep_start ?? '23:00').slice(0, 5))
  const [sleepEnd, setSleepEnd] = useState((user.sleep_end ?? '07:00').slice(0, 5))
  const [minimumBreak, setMinimumBreak] = useState(user.minimum_break_minutes ?? 15)
  const [undesirable, setUndesirable] = useState(user.undesirable_weekdays ?? [])
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  return (
    <section className="settings-section comfort-settings">
      <h2>Комфортное время</h2>
      <GlassPanel className="form-section">
        <div className="comfort-heading">
          <BedDouble size={19} />
          <span>
            <strong>Не предлагать во время сна</strong>
            <small>Учитывается вместе с рабочими часами и занятостью</small>
          </span>
        </div>
        <div className="field-row field-row--three">
          <label className="field">
            <span>Сон с</span>
            <input
              type="time"
              value={sleepStart}
              onChange={(event) => setSleepStart(event.target.value)}
            />
          </label>
          <label className="field">
            <span>До</span>
            <input
              type="time"
              value={sleepEnd}
              onChange={(event) => setSleepEnd(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Перерыв</span>
            <select
              value={minimumBreak}
              onChange={(event) => setMinimumBreak(Number(event.target.value))}
            >
              <option value="0">Нет</option>
              <option value="10">10 мин</option>
              <option value="15">15 мин</option>
              <option value="30">30 мин</option>
              <option value="60">1 час</option>
            </select>
          </label>
        </div>
        <div className="form-label comfort-days">
          <span>Нежелательные дни</span>
          <small>не попадут в предложения</small>
        </div>
        <div className="day-picker">
          {labels.map((label, index) => {
            const value = index + 1
            const active = undesirable.includes(value)
            return (
              <button
                key={label}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() =>
                  setUndesirable(
                    active ? undesirable.filter((item) => item !== value) : [...undesirable, value],
                  )
                }
              >
                {label}
              </button>
            )
          })}
        </div>
        <GlassButton
          variant="primary"
          disabled={saving}
          onClick={() =>
            void onSave(
              {
                sleep_start: sleepStart,
                sleep_end: sleepEnd,
                minimum_break_minutes: minimumBreak,
                undesirable_weekdays: undesirable,
              },
              'Комфортное время сохранено',
            )
          }
        >
          Сохранить комфортное время
        </GlassButton>
      </GlassPanel>
    </section>
  )
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function InstallAppSection({ onMessage }: { onMessage: (message: string) => void }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])
  return (
    <section className="settings-section">
      <h2>Приложение</h2>
      <GlassPanel className="install-panel">
        <span>
          <Smartphone size={22} />
        </span>
        <div>
          <strong>Установить «Время вместе»</strong>
          <small>Быстрый запуск с домашнего экрана и системные уведомления</small>
        </div>
        <GlassButton
          onClick={async () => {
            if (!prompt) {
              onMessage('Откройте меню браузера и выберите «Добавить на главный экран»')
              return
            }
            await prompt.prompt()
            const choice = await prompt.userChoice
            onMessage(
              choice.outcome === 'accepted'
                ? 'Приложение установлено'
                : 'Установку можно повторить позже',
            )
            setPrompt(null)
          }}
        >
          Установить
        </GlassButton>
      </GlassPanel>
    </section>
  )
}

function formatRubles(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount)
}

function paymentMethodLabel(method: PaymentMethod) {
  if (method === 'sbp') return 'СБП'
  if (method === 'mir_pay') return 'Мир Пэй'
  return 'Карта «Виза»'
}

function SettingsSheet({
  sheet,
  timezone,
  firstName,
  lastName,
  username,
  workdayStart,
  workdayEnd,
  timeFormat,
  weekStartsOn,
  saving,
  onClose,
  onSave,
}: {
  sheet: 'profile' | 'timezone' | 'workday' | 'format' | null
  timezone: string
  firstName: string
  lastName: string
  username: string
  workdayStart: string
  workdayEnd: string
  timeFormat: '12h' | '24h'
  weekStartsOn: number
  saving: boolean
  onClose: () => void
  onSave: (payload: Partial<User>, message: string) => Promise<void>
}) {
  const [zone, setZone] = useState(timezone)
  const [profileFirstName, setProfileFirstName] = useState(firstName)
  const [profileLastName, setProfileLastName] = useState(lastName)
  const [profileUsername, setProfileUsername] = useState(username)
  const [start, setStart] = useState(workdayStart)
  const [end, setEnd] = useState(workdayEnd)
  const [format, setFormat] = useState<'12h' | '24h'>(timeFormat)
  const [weekStart, setWeekStart] = useState(weekStartsOn)
  const dirty =
    (sheet === 'profile' &&
      (profileFirstName !== firstName ||
        profileLastName !== lastName ||
        profileUsername !== username)) ||
    (sheet === 'timezone' && zone !== timezone) ||
    (sheet === 'workday' && (start !== workdayStart || end !== workdayEnd)) ||
    (sheet === 'format' && (format !== timeFormat || weekStart !== weekStartsOn))

  useEffect(() => {
    if (!dirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  function requestClose() {
    if (!dirty || window.confirm('Изменения не сохранены и исчезнут. Закрыть без сохранения?')) {
      onClose()
    }
  }
  const title =
    sheet === 'profile'
      ? 'Профиль'
      : sheet === 'timezone'
        ? 'Часовой пояс'
        : sheet === 'workday'
          ? 'Рабочее время'
          : 'Формат времени'
  return (
    <ModalSheet open={sheet !== null} title={title} onClose={requestClose}>
      {sheet === 'profile' && (
        <div className="sheet-form">
          <div className="field-row field-row--two">
            <label className="field">
              <span>Имя</span>
              <input
                value={profileFirstName}
                onChange={(event) => setProfileFirstName(event.target.value)}
                placeholder="Тимофей"
              />
            </label>
            <label className="field">
              <span>Фамилия</span>
              <input
                value={profileLastName}
                onChange={(event) => setProfileLastName(event.target.value)}
                placeholder="Иванов"
              />
            </label>
          </div>
          <label className="field">
            <span>Логин</span>
            <input
              value={profileUsername}
              onChange={(event) => setProfileUsername(event.target.value)}
              placeholder="tima_schedule"
            />
          </label>
          <GlassButton
            disabled={saving || !profileFirstName.trim() || !profileUsername.trim()}
            onClick={() => {
              if (!window.confirm('Сохранить изменения профиля? Логин используется для входа.'))
                return
              void onSave(
                {
                  first_name: profileFirstName,
                  last_name: profileLastName || null,
                  username: profileUsername,
                },
                'Профиль сохранён',
              )
            }}
          >
            Сохранить
          </GlassButton>
        </div>
      )}
      {sheet === 'timezone' && (
        <div className="sheet-form">
          <label className="field">
            <span>Часовой пояс</span>
            <select value={zone} onChange={(event) => setZone(event.target.value)}>
              {timezoneOptionsWithCurrent(zone).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
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
