import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useTheme } from './hooks/useTheme'
import { initializeTelegram } from './lib/telegram'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BusyCreatePage } from './pages/BusyCreatePage'
import { CalendarPage } from './pages/CalendarPage'
import { FriendsPage } from './pages/FriendsPage'
import { MeetingDetailPage } from './pages/MeetingDetailPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  useTheme()
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading',
  )
  useEffect(() => {
    void initializeTelegram().then((authenticated) => {
      setAuthState(authenticated ? 'authenticated' : 'unauthenticated')
    })
  }, [])
  if (authState === 'loading') return <AuthMessage title="Подключение к Telegram…" />
  if (authState === 'unauthenticated') {
    return <AuthMessage title="Откройте приложение через Telegram" />
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CalendarPage />} />
          <Route path="busy/new" element={<BusyCreatePage />} />
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

function AuthMessage({ title }: { title: string }) {
  return (
    <main className="auth-message">
      <div className="auth-message__panel">
        <span className="eyebrow">TimeTogether</span>
        <h1>{title}</h1>
        <p>Личные данные календаря доступны только после авторизации Telegram.</p>
      </div>
    </main>
  )
}
