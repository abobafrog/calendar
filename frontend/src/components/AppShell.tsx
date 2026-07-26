import { Suspense, lazy } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

const ThemeBackground = lazy(() =>
  import('./ThemeBackground').then((module) => ({ default: module.ThemeBackground })),
)

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <Suspense fallback={null}>
          <ThemeBackground />
        </Suspense>
      </div>
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}
