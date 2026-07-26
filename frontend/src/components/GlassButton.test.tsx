import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GlassButton } from './GlassButton'

describe('GlassButton', () => {
  it('runs the command and exposes button semantics', () => {
    const onClick = vi.fn()
    render(<GlassButton onClick={onClick}>Сохранить</GlassButton>)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
