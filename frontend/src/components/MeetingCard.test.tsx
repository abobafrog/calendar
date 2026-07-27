import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { meetings } from '../lib/demo'
import { MeetingCard } from './MeetingCard'

describe('MeetingCard', () => {
  it('shows meeting status and response progress', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MeetingCard meeting={meetings[0]} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Обсуждение проекта')).toBeInTheDocument()
    expect(screen.getByText('2/3 приняли')).toBeInTheDocument()
  })
})
