import { describe, expect, it } from 'vitest'
import { toMurinsky } from './language'

describe('murinsky language', () => {
  it('uses the explicit family and friend vocabulary', () => {
    expect(toMurinsky('Я, жена, друг и сын')).toBe('Ч, жинка, друн и сыр')
  })

  it('adds ость or ность but preserves verbs and exceptions', () => {
    expect(toMurinsky('Карта, жир, ночь. Сходить в ХАММАМ и готовлю БУРМАЛДУ.')).toBe(
      'Картость, жирность, ночность. Сходить в ХАММАМ и готовлю БУРМАЛДУ.',
    )
  })

  it('translates the massage table template predictably', () => {
    expect(toMurinsky('Массажные столы')).toBe('Массажность столность')
  })

  it('never translates finite verbs', () => {
    expect(toMurinsky('Система выбирает, друг скрыл, участники голосуют, приложение работает')).toBe(
      'Системость выбирает, друн скрыл, участникность голосуют, приложениость работает',
    )
  })
})
