import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_REQUIRED_EVENT, signOut } from './client'

describe('signOut', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('revokes the server session before announcing the session change', async () => {
    const sessionListener = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    window.addEventListener(AUTH_REQUIRED_EVENT, sessionListener)

    await signOut()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(sessionListener).toHaveBeenCalledOnce()
    window.removeEventListener(AUTH_REQUIRED_EVENT, sessionListener)
  })
})
