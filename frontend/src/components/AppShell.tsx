import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { SiteNotifications } from './SiteNotifications'
import { ThemeBackground } from './ThemeBackground'

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <ThemeBackground />
      </div>
      <main className="app-content">
        <Outlet />
      </main>
      <SiteNotifications />
      <BottomNavigation />
    </div>
  )
}
