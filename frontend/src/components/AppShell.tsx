import { Suspense, lazy } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

const PixelBlast = lazy(() => import('./PixelBlast').then((module) => ({ default: module.PixelBlast })))

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <Suspense fallback={null}>
          <PixelBlast
            variant="circle"
            pixelSize={7}
            color="#8b7dff"
            patternScale={2.2}
            patternDensity={1.22}
            pixelSizeJitter={0.45}
            enableRipples={false}
            liquid
            liquidStrength={0.08}
            liquidRadius={1.1}
            liquidWobbleSpeed={4.2}
            speed={0.45}
            edgeFade={0.18}
            transparent
          />
        </Suspense>
      </div>
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}
