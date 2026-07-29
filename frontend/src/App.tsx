import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ThemeBackground } from './components/ThemeBackground'
import {
  AUTH_REQUIRED_EVENT,
  ApiError,
  apiRequest,
  clearAccessToken,
  hasAccessToken,
  setAccessToken,
} from './api/client'
import { useTheme } from './hooks/useTheme'
import { resetMobileViewport } from './lib/viewport'
import type { AuthResponse, User } from './lib/types'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BusyCreatePage } from './pages/BusyCreatePage'
import { BusyEditPage } from './pages/BusyEditPage'
import { CalendarPage } from './pages/CalendarPage'
import { FriendsPage } from './pages/FriendsPage'
import { LoginPage } from './pages/LoginPage'
import { MeetingDetailPage } from './pages/MeetingDetailPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  useTheme()
  const queryClient = useQueryClient()
  const [session, setSession] = useState<'checking' | 'authenticated' | 'anonymous'>(() =>
    hasAccessToken() ? 'checking' : 'anonymous',
  )
  const [sessionMessage, setSessionMessage] = useState('Проверяем сессию…')

  useEffect(() => {
    let active = true
    let retryTimer: number | undefined
    const requireAuthentication = () => {
      clearAccessToken()
      queryClient.clear()
      if (active) setSession('anonymous')
    }
    const verifySession = () => {
      void apiRequest<User>('/users/me')
        .then((user) => {
          if (!active) return
          queryClient.setQueryData(['me'], user)
          resetMobileViewport()
          setSessionMessage('Проверяем сессию…')
          setSession('authenticated')
        })
        .catch((error: unknown) => {
          if (!active) return
          if (error instanceof ApiError && error.status === 401) {
            requireAuthentication()
            return
          }
          setSessionMessage('Сервер временно недоступен. Повторяем подключение…')
          retryTimer = window.setTimeout(verifySession, 3_000)
        })
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, requireAuthentication)
    if (hasAccessToken()) {
      verifySession()
    }

    return () => {
      active = false
      window.clearTimeout(retryTimer)
      window.removeEventListener(AUTH_REQUIRED_EVENT, requireAuthentication)
    }
  }, [queryClient])

  function handleAuthenticated(auth: AuthResponse) {
    setAccessToken(auth.access_token)
    queryClient.setQueryData(['me'], auth.user)
    setSession('authenticated')
    resetMobileViewport()
  }

  if (session === 'checking') {
    return (
      <div className="session-loading">
        <div className="app-background" aria-hidden="true">
          <ThemeBackground />
        </div>
        <p>{sessionMessage}</p>
      </div>
    )
  }

  const inviteTarget = new URLSearchParams(window.location.search).has('invite')
    ? `/friends${window.location.search}`
    : '/'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="login"
          element={
            session === 'authenticated' ? (
              <Navigate to={inviteTarget} replace />
            ) : (
              <LoginPage onAuthenticated={handleAuthenticated} />
            )
          }
        />
        <Route
          element={
            session === 'authenticated' ? (
              <AppShell />
            ) : (
              <Navigate to={`/login${window.location.search}`} replace />
            )
          }
        >
          <Route index element={<CalendarPage />} />
          <Route path="busy/new" element={<BusyCreatePage />} />
          <Route path="busy/:id/edit" element={<BusyEditPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="meetings/:id" element={<MeetingDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
