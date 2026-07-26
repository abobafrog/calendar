import type { BusyInterval } from '../lib/types'
import { colorForUser } from '../lib/colors'
import { formatLocalClockTime, type TimeFormat } from '../lib/time'
import { BusyBlock } from './BusyBlock'
import { FreeSlot } from './FreeSlot'

const START_HOUR = 8
const END_HOUR = 20
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

function percent(date: Date) {
  return (
    (((date.getHours() - START_HOUR) * 60 + date.getMinutes()) / ((END_HOUR - START_HOUR) * 60)) *
    100
  )
}

function timeLabels(timeFormat: TimeFormat) {
  return HOURS.map((hour) => (
    <span key={hour} style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}>
      {formatLocalClockTime(`${String(hour).padStart(2, '0')}:00`, timeFormat)}
    </span>
  ))
}

function gridLines() {
  return HOURS.map((hour) => (
    <i key={hour} style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }} />
  ))
}

export function TimeGrid({
  intervals,
  date,
  showFree = false,
  view = 'day',
  timeFormat = '24h',
}: {
  intervals: BusyInterval[]
  date: Date
  showFree?: boolean
  view?: 'day' | 'week'
  timeFormat?: TimeFormat
}) {
  if (view === 'week') {
    const monday = new Date(date)
    const day = monday.getDay() || 7
    monday.setDate(monday.getDate() - day + 1)
    const days = Array.from({ length: 7 }, (_, index) => {
      const item = new Date(monday)
      item.setDate(monday.getDate() + index)
      return item
    })
    return (
      <div className="time-grid time-grid--week" aria-label="Недельная календарная сетка">
        <div className="time-grid__labels">{timeLabels(timeFormat)}</div>
        <div className="time-grid__week-canvas">
          {days.map((day) => {
            const dayIntervals = intervals.filter(
              (item) => new Date(item.start_at).toDateString() === day.toDateString(),
            )
            return (
              <div className="week-column" key={day.toISOString()}>
                <header>
                  <span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                </header>
                <div className="week-column__body">
                  {gridLines()}
                  {dayIntervals.map((interval) => {
                    const top = Math.max(0, percent(new Date(interval.start_at)))
                    const bottom = Math.min(100, percent(new Date(interval.end_at)))
                    return (
                      <BusyBlock
                        key={interval.id}
                        interval={interval}
                        top={top}
                        height={Math.max(3, bottom - top)}
                        color={colorForUser(interval.user_id)}
                        timeFormat={timeFormat}
                        compact
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  const sameDay = intervals.filter(
    (item) => new Date(item.start_at).toDateString() === date.toDateString(),
  )
  return (
    <div className="time-grid" aria-label="Календарная сетка">
      <div className="time-grid__labels">{timeLabels(timeFormat)}</div>
      <div className="time-grid__canvas">
        {gridLines()}
        {showFree && <FreeSlot top={46} height={12} />}
        {sameDay.map((interval) => {
          const top = Math.max(0, percent(new Date(interval.start_at)))
          const bottom = Math.min(100, percent(new Date(interval.end_at)))
          return (
            <BusyBlock
              key={interval.id}
              interval={interval}
              top={top}
              height={Math.max(3, bottom - top)}
              color={colorForUser(interval.user_id)}
              timeFormat={timeFormat}
              compact={bottom - top < 8}
            />
          )
        })}
        <div
          className="time-grid__now"
          style={{ top: `${Math.min(100, Math.max(0, percent(new Date())))}%` }}
        />
      </div>
    </div>
  )
}
