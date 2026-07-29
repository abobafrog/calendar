import type { BusyInterval } from './types'

export interface PositionedInterval {
  interval: BusyInterval
  startAt: Date
  endAt: Date
  lane: number
  laneCount: number
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
