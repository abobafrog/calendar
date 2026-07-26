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
            pixelSize={6}
            color="#7a787c"
            patternScale={2.5}
            patternDensity={1.1}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.22}
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
