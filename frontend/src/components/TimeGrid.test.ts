import { describe, expect, it } from 'vitest'
import type { BusyInterval } from '../lib/types'
import { calendarDisplayHours, layoutOverlappingIntervals } from '../lib/calendarLayout'

function interval(id: number, userId: number, start: string, end: string): BusyInterval {
  return {
    id,
    user_id: userId,
    meeting_id: null,
    start_at: `2026-07-29T${start}:00+03:00`,
    end_at: `2026-07-29T${end}:00+03:00`,
    title: `Дело ${id}`,
    visibility: 'open',
  }
}

describe('раскладка пересекающихся дел', () => {
  it('разносит дела пользователя и друзей по отдельным дорожкам', () => {
    const result = layoutOverlappingIntervals(
      [
        interval(1, 1, '10:00', '12:00'),
        interval(2, 2, '10:30', '11:30'),
        interval(3, 3, '11:00', '13:00'),
      ],
      new Date('2026-07-29T08:00:00+03:00'),
      new Date('2026-07-29T20:00:00+03:00'),
    )

    expect(result.map((item) => item.lane)).toEqual([0, 1, 2])
    expect(result.map((item) => item.laneCount)).toEqual([3, 3, 3])
  })

  it('повторно использует свободную дорожку и обрезает дело границами сетки', () => {
    const result = layoutOverlappingIntervals(
      [interval(1, 1, '07:00', '09:00'), interval(2, 2, '09:00', '10:00')],
      new Date('2026-07-29T08:00:00+03:00'),
      new Date('2026-07-29T20:00:00+03:00'),
    )

    expect(result.map((item) => item.lane)).toEqual([0, 0])
    expect(result[0].startAt.toISOString()).toBe(
      new Date('2026-07-29T08:00:00+03:00').toISOString(),
    )
  })

  it('расширяет сетку для ранних и поздних дел', () => {
    const result = calendarDisplayHours(
      [interval(1, 1, '06:15', '07:00'), interval(2, 1, '21:00', '23:30')],
      [new Date('2026-07-29T12:00:00+03:00')],
    )

    expect(result).toEqual({ startHour: 6, endHour: 24 })
  })

  it('оставляет удобный дневной диапазон, когда дел вне него нет', () => {
    const result = calendarDisplayHours(
      [interval(1, 1, '10:00', '12:00')],
      [new Date('2026-07-29T12:00:00+03:00')],
    )

    expect(result).toEqual({ startHour: 8, endHour: 20 })
  })
})
