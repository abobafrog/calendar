import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { meetings } from '../lib/demo'
import { MeetingCard } from './MeetingCard'

describe('MeetingCard', () => {
  it('shows meeting status and response progress', () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={meetings[0]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Обсуждение проекта')).toBeInTheDocument()
    expect(screen.getByText('2/3 приняли')).toBeInTheDocument()
  })
})
