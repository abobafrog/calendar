const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
export const AUTH_REQUIRED_EVENT = 'timetogether:auth-required'

export async function signOut() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } finally {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      signal: init.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Сервер не ответил вовремя. Попробуйте ещё раз.', 0, 'request_timeout')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
    }
    throw new ApiError(
      body?.error?.message ?? `Ошибка сервера: ${response.status}`,
      response.status,
      body?.error?.code,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
