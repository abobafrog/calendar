import type { BusyInterval } from '../lib/types'
import { colorForUser } from '../lib/colors'
import { calendarDisplayHours, layoutOverlappingIntervals } from '../lib/calendarLayout'
import { formatLocalClockTime, type TimeFormat } from '../lib/time'
import { BusyBlock } from './BusyBlock'
import { FreeSlot } from './FreeSlot'

function visibleRange(day: Date, startHour: number, endHour: number) {
  const start = new Date(day)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(day)
  end.setHours(endHour, 0, 0, 0)
  return { start, end }
}

function percent(date: Date, rangeStart: Date, rangeEnd: Date) {
  return (
    ((date.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100
  )
}

function hoursBetween(startHour: number, endHour: number) {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)
}

function timeLabels(timeFormat: TimeFormat, startHour: number, endHour: number) {
  return hoursBetween(startHour, endHour).map((hour) => (
    <span key={hour} style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }}>
      {formatLocalClockTime(`${String(hour).padStart(2, '0')}:00`, timeFormat)}
    </span>
  ))
}

function gridLines(startHour: number, endHour: number) {
  return hoursBetween(startHour, endHour).map((hour) => (
    <i key={hour} style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }} />
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
    const { startHour, endHour } = calendarDisplayHours(intervals, days)
    return (
      <div className="time-grid time-grid--week" aria-label="Недельная календарная сетка">
        <div className="time-grid__labels">{timeLabels(timeFormat, startHour, endHour)}</div>
        <div className="time-grid__week-canvas">
          {days.map((day) => {
            const range = visibleRange(day, startHour, endHour)
            const dayIntervals = layoutOverlappingIntervals(intervals, range.start, range.end)
            return (
              <div className="week-column" key={day.toISOString()}>
                <header>
                  <span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                </header>
                <div className="week-column__body">
                  {gridLines(startHour, endHour)}
                  {dayIntervals.map(({ interval, startAt, endAt, lane, laneCount }) => {
                    const top = percent(startAt, range.start, range.end)
                    const bottom = percent(endAt, range.start, range.end)
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
  const { startHour, endHour } = calendarDisplayHours(intervals, [date])
  const range = visibleRange(date, startHour, endHour)
  const sameDay = layoutOverlappingIntervals(intervals, range.start, range.end)
  return (
    <div className="time-grid" aria-label="Календарная сетка">
      <div className="time-grid__labels">{timeLabels(timeFormat, startHour, endHour)}</div>
      <div className="time-grid__canvas">
        {gridLines(startHour, endHour)}
        {showFree && <FreeSlot top={46} height={12} />}
        {sameDay.map(({ interval, startAt, endAt, lane, laneCount }) => {
          const top = percent(startAt, range.start, range.end)
          const bottom = percent(endAt, range.start, range.end)
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
          style={{
            top: `${Math.min(100, Math.max(0, percent(new Date(), range.start, range.end)))}%`,
          }}
        />
      </div>
    </div>
  )
}
