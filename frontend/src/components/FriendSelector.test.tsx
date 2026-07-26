import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { friends } from '../lib/demo'
import { FriendSelector } from './FriendSelector'

describe('FriendSelector', () => {
  it('adds an unselected friend without dropping prior selections', () => {
    const onChange = vi.fn()
    render(<FriendSelector friends={friends} selected={[friends[0].id]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Мария/ }))
    expect(onChange).toHaveBeenCalledWith([friends[0].id, friends[1].id])
  })
})
