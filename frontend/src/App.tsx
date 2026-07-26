import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { hasAccessToken, setAccessToken } from './api/client'
import { useTheme } from './hooks/useTheme'
import type { AuthResponse } from './lib/types'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { BusyCreatePage } from './pages/BusyCreatePage'
import { CalendarPage } from './pages/CalendarPage'
import { FriendsPage } from './pages/FriendsPage'
import { LoginPage } from './pages/LoginPage'
import { MeetingDetailPage } from './pages/MeetingDetailPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  useTheme()
  const [authenticated, setAuthenticated] = useState(hasAccessToken())

  function handleAuthenticated(auth: AuthResponse) {
    setAccessToken(auth.access_token)
    setAuthenticated(true)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage onAuthenticated={handleAuthenticated} />} />
        <Route element={authenticated ? <AppShell /> : <Navigate to="/login" replace />}>
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
