import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaymentSheet } from './PaymentSheet'

describe('PaymentSheet', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('выбирает карту по умолчанию и продолжает только после подтверждения', async () => {
    vi.useFakeTimers()
    const onConfirmed = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    render(
      <PaymentSheet
        open
        onClose={() => undefined}
        onConfirmed={onConfirmed}
        onSuccess={onSuccess}
      />,
    )

    expect(screen.getByRole('radio', { name: /Карта «Виза» •••• 4242/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Оплатить 99 ₽' }))
    expect(screen.getByText('Готовим безопасную оплату')).toBeInTheDocument()
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(650))
    expect(screen.getByText('Связываемся с банком')).toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(650))
    expect(screen.getByText('Оплачиваем создание занятости')).toBeInTheDocument()
    await act(async () => vi.advanceTimersByTime(650))
    expect(screen.getByText('Ещё чуть-чуть — занятость будет готова')).toBeInTheDocument()
    expect(onConfirmed).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(650))
    expect(onConfirmed).toHaveBeenCalledOnce()
    expect(screen.getByText('Оплата подтверждена')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(650))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('показывает выбранную сумму пожертвования', () => {
    render(
      <PaymentSheet
        open
        purpose="donation"
        amount={125000}
        onClose={() => undefined}
        onConfirmed={vi.fn().mockResolvedValue(undefined)}
        onSuccess={() => undefined}
      />,
    )

    expect(screen.getByText('Пожертвование проекту')).toBeInTheDocument()
    expect(screen.getByText('125 000 ₽')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Оплатить 125.000 ₽/ })).toBeInTheDocument()
  })
})
