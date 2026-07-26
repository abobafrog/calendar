import type { BusyInterval } from '../lib/types'
import { formatTimeInZone, type TimeFormat } from '../lib/time'

export function BusyBlock({
  interval,
  top,
  height,
  color,
  compact = false,
  timeFormat = '24h',
}: {
  interval: BusyInterval
  top: number
  height: number
  color: string
  compact?: boolean
  timeFormat?: TimeFormat
}) {
  const time = `${formatTimeInZone(interval.start_at, undefined, timeFormat)}–${formatTimeInZone(
    interval.end_at,
    undefined,
    timeFormat,
  )}`
  return (
    <div
      className={`busy-block ${compact ? 'is-compact' : ''}`}
      style={
        { top: `${top}%`, height: `${height}%`, '--block-color': color } as React.CSSProperties
      }
    >
      <strong>{interval.title ?? 'Занят'}</strong>
      <span>{time}</span>
    </div>
  )
}
