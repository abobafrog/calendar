import { useEffect, useState } from 'react'
import type { ThemeMode } from '../lib/types'
import { Grainient } from './Grainient'

interface Palette {
  color1: string
  color2: string
  color3: string
}

const palettes: Record<ThemeMode, Palette> = {
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
  return 'dark'
}

export function ThemeBackground() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  useEffect(() => {
    const updateTheme = () => setTheme(readTheme())
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => {
      observer.disconnect()
    }
  }, [])
  const palette = palettes[theme]

  return (
    <Grainient
      color1={palette.color1}
      color2={palette.color2}
      color3={palette.color3}
      timeSpeed={0.15}
      colorBalance={0.03}
      warpStrength={1.75}
      warpFrequency={2.8}
      warpSpeed={1.5}
      warpAmplitude={50}
      blendAngle={0}
      blendSoftness={0.05}
      rotationAmount={500}
      noiseScale={1.15}
      grainAmount={0.035}
      grainScale={1.4}
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
