import type { BusyInterval } from './types'

export interface PositionedInterval {
  interval: BusyInterval
  startAt: Date
  endAt: Date
  lane: number
  laneCount: number
}

const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 20

export function calendarDisplayHours(intervals: BusyInterval[], days: Date[]) {
  let startHour = DEFAULT_START_HOUR
  let endHour = DEFAULT_END_HOUR

  for (const day of days) {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(24, 0, 0, 0)

    for (const interval of intervals) {
      const intervalStart = new Date(interval.start_at)
      const intervalEnd = new Date(interval.end_at)
      if (intervalStart >= dayEnd || intervalEnd <= dayStart) continue
      const clippedStart = new Date(Math.max(intervalStart.getTime(), dayStart.getTime()))
      const clippedEnd = new Date(Math.min(intervalEnd.getTime(), dayEnd.getTime()))
      const startMinutes = (clippedStart.getTime() - dayStart.getTime()) / 60_000
      const endMinutes = (clippedEnd.getTime() - dayStart.getTime()) / 60_000
      startHour = Math.min(startHour, Math.floor(startMinutes / 60))
      endHour = Math.max(endHour, Math.ceil(endMinutes / 60))
    }
  }

  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) }
}

export function layoutOverlappingIntervals(
  intervals: BusyInterval[],
  rangeStart: Date,
  rangeEnd: Date,
): PositionedInterval[] {
  const segments = intervals
    .map((interval) => ({
      interval,
      startAt: new Date(Math.max(new Date(interval.start_at).getTime(), rangeStart.getTime())),
      endAt: new Date(Math.min(new Date(interval.end_at).getTime(), rangeEnd.getTime())),
    }))
    .filter((item) => item.startAt < item.endAt)
    .sort(
      (left, right) =>
        left.startAt.getTime() - right.startAt.getTime() ||
        left.endAt.getTime() - right.endAt.getTime() ||
        left.interval.id - right.interval.id,
    )

  const result: PositionedInterval[] = []
  let group: Array<Omit<PositionedInterval, 'laneCount'>> = []
  let groupEnd = Number.NEGATIVE_INFINITY
  let laneEnds: number[] = []

  const finishGroup = () => {
    const laneCount = Math.max(1, laneEnds.length)
    result.push(...group.map((item) => ({ ...item, laneCount })))
    group = []
    laneEnds = []
  }

  for (const segment of segments) {
    const start = segment.startAt.getTime()
    const end = segment.endAt.getTime()
    if (group.length && start >= groupEnd) finishGroup()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    group.push({ ...segment, lane })
    groupEnd = Math.max(groupEnd, end)
  }
  if (group.length) finishGroup()
  return result
}
