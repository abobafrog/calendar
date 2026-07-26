import { useEffect, useMemo, useState } from 'react'
import type { ThemeMode } from '../lib/types'
import { Grainient } from './Grainient'

interface Palette {
  color1: string
  color2: string
  color3: string
}

const palettes: Record<Exclude<ThemeMode, 'telegram'> | 'telegramLight' | 'telegramDark', Palette> =
  {
    telegramLight: {
      color1: '#f7e9ff',
      color2: '#8f7cff',
      color3: '#dcecff',
    },
    telegramDark: {
      color1: '#1e0a1e',
      color2: '#5227FF',
      color3: '#332f36',
    },
    light: {
      color1: '#fff4fc',
      color2: '#a493ff',
      color3: '#e5f2ff',
    },
    dark: {
      color1: '#210d2a',
      color2: '#6841ff',
      color3: '#23212e',
    },
    contrast: {
      color1: '#000000',
      color2: '#7455ff',
      color3: '#101014',
    },
  }

function readTheme(): ThemeMode {
  const theme = document.documentElement.dataset.theme
  if (theme === 'light' || theme === 'dark' || theme === 'contrast') return theme
  return 'telegram'
}

export function ThemeBackground() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => setTheme(readTheme())
    const updateSystemTheme = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    media.addEventListener('change', updateSystemTheme)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', updateSystemTheme)
    }
  }, [])

  const palette = useMemo(() => {
    if (theme === 'telegram') return palettes[prefersDark ? 'telegramDark' : 'telegramLight']
    return palettes[theme]
  }, [prefersDark, theme])

  return (
    <Grainient
      color1={palette.color1}
      color2={palette.color2}
      color3={palette.color3}
      timeSpeed={0.15}
      colorBalance={0.03}
      warpStrength={1.75}
      warpFrequency={5}
      warpSpeed={1.5}
      warpAmplitude={50}
      blendAngle={0}
      blendSoftness={0.05}
      rotationAmount={500}
      noiseScale={2}
      grainAmount={0.1}
      grainScale={2}
      grainAnimated={false}
      contrast={1.5}
      gamma={1}
      saturation={1}
      centerX={0}
      centerY={0}
      zoom={0.9}
    />
  )
}
