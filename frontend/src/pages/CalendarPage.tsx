import { Check, ListFilter, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCalendarRange, useCurrentUser, useFriendCalendarRange, useFriends } from '../api/hooks'
import { DateSwitcher } from '../components/DateSwitcher'
import { FriendSelector } from '../components/FriendSelector'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { UserAvatar } from '../components/UserAvatar'
import { TimeGrid } from '../components/TimeGrid'
import { colorForUser } from '../lib/colors'
import { formatDateInZone, formatTimeInZone } from '../lib/time'
import type { BusyInterval, Friend, User } from '../lib/types'

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
type CalendarView = 'day' | 'week' | 'month'

export function CalendarPage() {
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
      ? 'week'
      : 'month',
  )
  const [selected, setSelected] = useState<number[]>([])
  const currentUserQuery = useCurrentUser()
  const friendQuery = useFriends()
  const range = useMemo(() => calendarRange(date, view), [date, view])
  const calendarQuery = useCalendarRange(range.start, range.end)
  const friendCalendarQuery = useFriendCalendarRange(range.start, range.end, selected)
  const availableFriends = friendQuery.data ?? []
  const selectedFriendIntervals = useMemo(
    () => friendCalendarQuery.data?.flatMap((calendar) => calendar.intervals) ?? [],
    [friendCalendarQuery.data],
  )
  const shownIntervals = useMemo(
    () => [...(calendarQuery.data ?? []), ...selectedFriendIntervals],
    [calendarQuery.data, selectedFriendIntervals],
  )
  const dayIntervals = useMemo(
    () =>
      shownIntervals
        .filter((interval) => new Date(interval.start_at).toDateString() === date.toDateString())
        .sort(
          (left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime(),
        ),
    [date, shownIntervals],
  )
  const monday = useMemo(() => {
    const next = new Date(date)
    const day = next.getDay() || 7
    next.setDate(next.getDate() - day + 1)
    return next
  }, [date])

  if (!currentUserQuery.data) return <div className="page loading-state">Загружаем календарь…</div>
  const allFriendsSelected =
    availableFriends.length > 0 && selected.length === availableFriends.length

  return (
    <div className="page calendar-page">
      <header className="page-header page-header--calendar">
        <div>
          <span className="eyebrow">TimeTogether</span>
          <h1>Календарь</h1>
        </div>
        <GlassButton
          variant="icon"
          aria-label={allFriendsSelected ? 'Скрыть друзей' : 'Показать всех друзей'}
          onClick={() => {
            setSelected(allFriendsSelected ? [] : availableFriends.map((friend) => friend.id))
          }}
        >
          <ListFilter size={20} />
        </GlassButton>
      </header>
      <div className="calendar-toolbar">
        <DateSwitcher
          date={date}
          onChange={setDate}
          step={view === 'month' ? 'month' : view}
          label={
            view === 'month'
              ? date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
              : undefined
          }
        />
        <div className="segmented-control" aria-label="Режим календаря">
          <button
            type="button"
            className={view === 'day' ? 'is-active' : ''}
            onClick={() => setView('day')}
          >
            День
          </button>
          <button
            type="button"
            className={view === 'week' ? 'is-active' : ''}
            onClick={() => setView('week')}
          >
            Неделя
          </button>
          <button
            type="button"
            className={view === 'month' ? 'is-active' : ''}
            onClick={() => setView('month')}
          >
            Месяц
          </button>
        </div>
      </div>
      {view === 'month' ? (
        <>
          <PersonFilter
            currentUser={currentUserQuery.data}
            friends={availableFriends}
            selected={selected}
            onChange={setSelected}
          />
          <MonthCalendar
            date={date}
            currentUserId={currentUserQuery.data.id}
            intervals={shownIntervals}
            selectedFriendIds={selected}
            onSelectDate={setDate}
          />
        </>
      ) : (
        <>
          <div className="week-strip">
            {weekDays.map((label, index) => {
              const item = new Date(monday)
              item.setDate(monday.getDate() + index)
              const active = item.toDateString() === date.toDateString()
              return (
                <button
                  key={label}
                  type="button"
                  className={active ? 'is-active' : ''}
                  onClick={() => setDate(item)}
                >
                  <span>{label}</span>
                  <strong>{item.getDate()}</strong>
                </button>
              )
            })}
          </div>
          <section className="calendar-friends">
            <div className="section-heading">
              <div>
                <span>Наложение</span>
                <h2>Графики друзей</h2>
              </div>
              <span className="selection-count">{selected.length || 'Нет'}</span>
            </div>
            <FriendSelector friends={availableFriends} selected={selected} onChange={setSelected} />
          </section>
          <div className={view === 'week' ? 'calendar-grid-wrap is-week' : 'calendar-grid-wrap'}>
            <TimeGrid
              intervals={shownIntervals}
              date={date}
              showFree={selected.length > 0}
              view={view}
              timeFormat={currentUserQuery.data.time_format ?? '24h'}
            />
          </div>
          {view === 'day' && (
            <section className="day-agenda">
              <div className="section-heading">
                <div>
                  <span>День</span>
                  <h2>
                    {date.toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h2>
                </div>
                <span className="selection-count">{dayIntervals.length || '0'}</span>
              </div>
              <div className="day-agenda__list">
                {dayIntervals.length ? (
                  dayIntervals.map((interval) => {
                    const owner =
                      interval.user_id === currentUserQuery.data.id
                        ? currentUserQuery.data
                        : availableFriends.find((friend) => friend.id === interval.user_id)
                    const title = interval.title ?? 'Занят'
                    return (
                      <GlassPanel key={interval.id} className="day-agenda__item">
                        <div className="day-agenda__time">
                          <strong>
                            {formatTimeInZone(
                              interval.start_at,
                              currentUserQuery.data.timezone ?? 'UTC',
                              currentUserQuery.data.time_format ?? '24h',
                            )}{' '}
                            —{' '}
                            {formatTimeInZone(
                              interval.end_at,
                              currentUserQuery.data.timezone ?? 'UTC',
                              currentUserQuery.data.time_format ?? '24h',
                            )}
                          </strong>
                          <span>
                            {formatDateInZone(
                              interval.start_at,
                              currentUserQuery.data.timezone ?? 'UTC',
                            )}
                          </span>
                        </div>
                        <div className="day-agenda__body">
                          <UserAvatar user={owner ?? currentUserQuery.data} size="sm" />
                          <div>
                            <strong>{title}</strong>
                            <span>{owner ? owner.first_name : 'Вы'}</span>
                          </div>
                        </div>
                      </GlassPanel>
                    )
                  })
                ) : (
                  <GlassPanel className="day-agenda__empty">
                    <strong>В этот день ничего не занято</strong>
                    <span>Можно выбрать другой день или добавить интервалы.</span>
                  </GlassPanel>
                )}
              </div>
            </section>
          )}
        </>
      )}
      <Link to="/busy/new" className="floating-action" aria-label="Добавить занятость">
        <Plus size={25} />
      </Link>
    </div>
  )
}

function PersonFilter({
  currentUser,
  friends,
  selected,
  onChange,
}: {
  currentUser: User
  friends: Friend[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }
  return (
    <div className="person-filter" aria-label="Люди в календаре">
      <button type="button" className="is-active">
        <span style={{ '--chip-color': colorForUser(currentUser.id) } as React.CSSProperties} />
        Вы
      </button>
      {friends.map((friend) => {
        const active = selected.includes(friend.id)
        return (
          <button
            key={friend.id}
            type="button"
            className={active ? 'is-active' : ''}
            onClick={() => toggle(friend.id)}
          >
            <span style={{ '--chip-color': colorForUser(friend.id) } as React.CSSProperties} />
            {friend.alias || friend.first_name}
            {active && <Check size={14} />}
          </button>
        )
      })}
    </div>
  )
}

function MonthCalendar({
  date,
  currentUserId,
  intervals,
  selectedFriendIds,
  onSelectDate,
}: {
  date: Date
  currentUserId: number
  intervals: BusyInterval[]
  selectedFriendIds: number[]
  onSelectDate: (date: Date) => void
}) {
  const days = useMemo(() => monthDays(date), [date])
  const todayKey = dayKey(new Date())
  const activeKey = dayKey(date)
  return (
    <section className="month-calendar" aria-label="Месячный календарь">
      <div className="month-calendar__weekdays">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="month-calendar__grid">
        {days.map((day) => {
          const key = dayKey(day)
          const dayIntervals = intervals
            .filter((interval) => overlapsDay(interval, day))
            .sort(
              (left, right) =>
                new Date(left.start_at).getTime() - new Date(right.start_at).getTime(),
            )
          const visible = dayIntervals.slice(0, 4)
          return (
            <button
              key={key}
              type="button"
              className={[
                'month-cell',
                day.getMonth() === date.getMonth() ? '' : 'is-muted',
                key === todayKey ? 'is-today' : '',
                key === activeKey ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(day)}
            >
              <strong>{day.getDate()}</strong>
              <span className="month-cell__events">
                {visible.map((interval) => {
                  const isOwn = interval.user_id === currentUserId
                  const title =
                    isOwn || selectedFriendIds.includes(interval.user_id) ? interval.title : null
                  return (
                    <i
                      key={`${interval.id}-${key}`}
                      style={
                        { '--chip-color': colorForUser(interval.user_id) } as React.CSSProperties
                      }
                    >
                      {title ?? 'Занято'}
                    </i>
                  )
                })}
                {dayIntervals.length > visible.length && (
                  <em>+{dayIntervals.length - visible.length}</em>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function calendarRange(date: Date, view: CalendarView) {
  if (view === 'month') {
    const days = monthDays(date)
    return { start: startOfDay(days[0]), end: addDays(startOfDay(days[days.length - 1]), 1) }
  }
  if (view === 'week') {
    const start = startOfWeek(date)
    return { start, end: addDays(start, 7) }
  }
  return { start: startOfDay(date), end: addDays(startOfDay(date), 1) }
}

function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function overlapsDay(interval: BusyInterval, day: Date) {
  const start = startOfDay(day)
  const end = addDays(start, 1)
  return new Date(interval.start_at) < end && new Date(interval.end_at) > start
}
