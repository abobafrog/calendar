import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaymentSheet } from './PaymentSheet'

describe('PaymentSheet', () => {
  afterEach(() => vi.useRealTimers())

  it('selects VISA by default and proceeds only after confirmation', async () => {
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

    expect(screen.getByRole('radio', { name: /VISA •••• 4242/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Оплатить 99 ₽' }))
    expect(screen.getByText('Ещё чуть-чуть — календарь будет готов')).toBeInTheDocument()
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(1_500))
    expect(onConfirmed).toHaveBeenCalledOnce()
    expect(screen.getByText('Оплата подтверждена')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(650))
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
