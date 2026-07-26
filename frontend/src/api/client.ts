const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

let accessToken: string | null = sessionStorage.getItem('access_token')

export function setAccessToken(token: string) {
  accessToken = token
  sessionStorage.setItem('access_token', token)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message ?? `API error ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
