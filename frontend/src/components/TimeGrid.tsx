import type { BusyInterval } from '../lib/types'
import { colorForUser } from '../lib/colors'
import { layoutOverlappingIntervals } from '../lib/calendarLayout'
import { formatLocalClockTime, type TimeFormat } from '../lib/time'
import { BusyBlock } from './BusyBlock'
import { FreeSlot } from './FreeSlot'

const START_HOUR = 8
const END_HOUR = 20
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

function visibleRange(day: Date) {
  const start = new Date(day)
  start.setHours(START_HOUR, 0, 0, 0)
  const end = new Date(day)
  end.setHours(END_HOUR, 0, 0, 0)
  return { start, end }
}

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
  onSelectInterval,
}: {
  intervals: BusyInterval[]
  date: Date
  showFree?: boolean
  view?: 'day' | 'week'
  timeFormat?: TimeFormat
  onSelectInterval?: (interval: BusyInterval) => void
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
            const range = visibleRange(day)
            const dayIntervals = layoutOverlappingIntervals(intervals, range.start, range.end)
            return (
              <div className="week-column" key={day.toISOString()}>
                <header>
                  <span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                </header>
                <div className="week-column__body">
                  {gridLines()}
                  {dayIntervals.map(({ interval, startAt, endAt, lane, laneCount }) => {
                    const top = percent(startAt)
                    const bottom = percent(endAt)
                    return (
                      <BusyBlock
                        key={interval.id}
                        interval={interval}
                        top={top}
                        height={Math.max(3, bottom - top)}
                        color={colorForUser(interval.user_id)}
                        timeFormat={timeFormat}
                        compact
                        lane={lane}
                        laneCount={laneCount}
                        onClick={onSelectInterval}
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
  const range = visibleRange(date)
  const sameDay = layoutOverlappingIntervals(intervals, range.start, range.end)
  return (
    <div className="time-grid" aria-label="Календарная сетка">
      <div className="time-grid__labels">{timeLabels(timeFormat)}</div>
      <div className="time-grid__canvas">
        {gridLines()}
        {showFree && <FreeSlot top={46} height={12} />}
        {sameDay.map(({ interval, startAt, endAt, lane, laneCount }) => {
          const top = percent(startAt)
          const bottom = percent(endAt)
          return (
            <BusyBlock
              key={interval.id}
              interval={interval}
              top={top}
              height={Math.max(3, bottom - top)}
              color={colorForUser(interval.user_id)}
              timeFormat={timeFormat}
              compact={bottom - top < 8}
              lane={lane}
              laneCount={laneCount}
              onClick={onSelectInterval}
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
