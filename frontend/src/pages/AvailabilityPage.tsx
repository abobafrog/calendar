import { ArrowLeft, CalendarRange, Clock3, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FriendSelector } from '../components/FriendSelector'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { ModalSheet } from '../components/ModalSheet'
import { Toast } from '../components/Toast'
import { AvatarStack } from '../components/UserAvatar'
import type { FreeSlotData } from '../lib/types'
import { formatDateInZone, formatTimeInZone, toLocalDateKey } from '../lib/time'
import { useAvailabilitySearch, useCreateMeeting, useCurrentUser, useFriends } from '../api/hooks'

const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function AvailabilityPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<number[]>([])
  const [searched, setSearched] = useState(false)
  const [chosen, setChosen] = useState<FreeSlotData | null>(null)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [dailyStart, setDailyStart] = useState('10:00')
  const [dailyEnd, setDailyEnd] = useState('22:00')
  const [minimumDuration, setMinimumDuration] = useState(60)
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5])
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const availabilityMutation = useAvailabilitySearch()
  const createMeeting = useCreateMeeting()
  const currentUserQuery = useCurrentUser()
  const userTimeFormat = currentUserQuery.data?.time_format ?? '24h'
  const userTimezone = currentUserQuery.data?.timezone ?? 'UTC'
  const friendsQuery = useFriends()
  const availableFriends = friendsQuery.data ?? []
  const [resultSlots, setResultSlots] = useState<FreeSlotData[]>([])
  const [{ today: initialToday, later: initialLater }] = useState(() => {
    const start = new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return {
      today: toLocalDateKey(start),
      later: toLocalDateKey(end),
    }
  })
  const [dateFrom, setDateFrom] = useState(initialToday)
  const [dateTo, setDateTo] = useState(initialLater)
  const toggleWeekday = (day: number) => {
    const next = weekdays.includes(day)
      ? weekdays.filter((item) => item !== day)
      : [...weekdays, day].sort()
    setWeekdays(next)
    if (day >= 6) setIncludeWeekends(next.includes(6) || next.includes(7))
  }
  return (
    <div className="page availability-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Пересечение графиков</span>
          <h1>Общее время</h1>
        </div>
        <div className="header-symbol">
          <Sparkles size={21} />
        </div>
      </header>
      {!searched ? (
        <>
          <GlassPanel className="form-section">
            <div className="form-label">
              <span>Участники</span>
              <small>{selected.length} выбрано</small>
            </div>
            <FriendSelector friends={availableFriends} selected={selected} onChange={setSelected} />
          </GlassPanel>
          <GlassPanel className="form-section">
            <div className="field-row field-row--two">
              <label className="field">
                <span>С даты</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="field">
                <span>По дату</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="field-row field-row--three">
              <label className="field">
                <span>Не раньше</span>
                <input
                  type="time"
                  value={dailyStart}
                  onChange={(event) => setDailyStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Не позже</span>
                <input
                  type="time"
                  value={dailyEnd}
                  onChange={(event) => setDailyEnd(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Минимум</span>
                <select
                  value={minimumDuration}
                  onChange={(event) => setMinimumDuration(Number(event.target.value))}
                >
                  <option value="30">30 мин</option>
                  <option value="45">45 мин</option>
                  <option value="60">1 час</option>
                  <option value="90">1,5 часа</option>
                </select>
              </label>
            </div>
          </GlassPanel>
          <GlassPanel className="form-section">
            <div className="form-label">
              <span>Дни недели</span>
            </div>
            <div className="day-picker">
              {weekDayLabels.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  className={weekdays.includes(index + 1) ? 'is-active' : ''}
                  onClick={() => toggleWeekday(index + 1)}
                >
                  {day}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <span>
                <strong>Учитывать выходные</strong>
                <small>Суббота и воскресенье</small>
              </span>
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={(event) => {
                  setIncludeWeekends(event.target.checked)
                  if (event.target.checked)
                    setWeekdays((items) => Array.from(new Set([...items, 6, 7])).sort())
                  else setWeekdays((items) => items.filter((day) => day < 6))
                }}
              />
              <i />
            </label>
          </GlassPanel>
          <GlassButton
            variant="primary"
            className="sticky-submit"
            onClick={async () => {
              const result = await availabilityMutation.mutateAsync({
                participant_ids: selected,
                date_from: dateFrom,
                date_to: dateTo,
                daily_start: dailyStart,
                daily_end: dailyEnd,
                minimum_duration_minutes: minimumDuration,
                weekdays,
                include_weekends: includeWeekends,
                timezone: userTimezone,
              })
              setResultSlots(result.slots)
              setSearched(true)
            }}
            disabled={!selected.length}
          >
            <Search size={19} />
            Найти время
          </GlassButton>
        </>
      ) : (
        <>
          <div className="results-header">
            <GlassButton variant="icon" onClick={() => setSearched(false)} aria-label="Назад">
              <ArrowLeft size={20} />
            </GlassButton>
            <div>
              <span>Найдено вариантов</span>
              <strong>{resultSlots.length}</strong>
            </div>
            <GlassButton onClick={() => setSearched(false)}>Изменить</GlassButton>
          </div>
          <div className="participant-summary">
            <AvatarStack
              users={availableFriends.filter((friend) => selected.includes(friend.id))}
            />
            <span>Все участники свободны</span>
          </div>
          <div className="slot-list">
            {resultSlots.map((slot) => {
              return (
                <GlassPanel key={slot.start_at} className="slot-card">
                  <div className="slot-card__time">
                    <Clock3 size={18} />
                    <div>
                      <strong>
                        {formatTimeInZone(slot.start_at, userTimezone, userTimeFormat)} —{' '}
                        {formatTimeInZone(slot.end_at, userTimezone, userTimeFormat)}
                      </strong>
                      <span>{formatDateInZone(slot.start_at)}</span>
                    </div>
                  </div>
                  <span className="free-label">Все свободны</span>
                  <GlassButton
                    variant="icon"
                    aria-label="Выбрать время"
                    onClick={() => setChosen(slot)}
                  >
                    <CalendarRange size={19} />
                  </GlassButton>
                </GlassPanel>
              )
            })}
          </div>
        </>
      )}
      <ModalSheet open={Boolean(chosen)} title="Предложить встречу" onClose={() => setChosen(null)}>
        <div className="sheet-form">
          <label className="field">
            <span>Название</span>
            <input
              value={meetingTitle}
              onChange={(event) => setMeetingTitle(event.target.value)}
              placeholder="Название встречи"
            />
          </label>
          {chosen && (
            <div className="selected-slot">
              <Clock3 size={18} />
              <span>
                {formatDateInZone(chosen.start_at, userTimezone)},{' '}
                {formatTimeInZone(chosen.start_at, userTimezone, userTimeFormat)}
              </span>
            </div>
          )}
          <GlassButton
            variant="primary"
            onClick={async () => {
              if (!chosen || !meetingTitle.trim()) {
                setToast('Введите название встречи')
                return
              }
              try {
                await createMeeting.mutateAsync({
                  title: meetingTitle.trim(),
                  start_at: chosen.start_at,
                  end_at: chosen.end_at,
                  participant_ids: selected,
                })
                setChosen(null)
                setToast('Предложение отправлено')
                window.setTimeout(() => navigate('/meetings'), 500)
              } catch (error) {
                setToast(
                  error instanceof Error ? error.message : 'Не удалось отправить предложение',
                )
              }
            }}
          >
            Отправить предложение
          </GlassButton>
        </div>
      </ModalSheet>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
