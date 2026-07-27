const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
export const AUTH_REQUIRED_EVENT = 'timetogether:auth-required'

let accessToken: string | null = sessionStorage.getItem('access_token')

export function hasAccessToken() {
  return Boolean(accessToken)
}

export function setAccessToken(token: string) {
  accessToken = token
  sessionStorage.setItem('access_token', token)
}

export function clearAccessToken() {
  accessToken = null
  sessionStorage.removeItem('access_token')
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
      signal: init.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
    if (response.status === 401 && accessToken) {
      clearAccessToken()
      window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
    }
    throw new ApiError(
      body?.error?.message ?? `API error ${response.status}`,
      response.status,
      body?.error?.code,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
