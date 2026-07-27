import { useEffect, useState } from 'react'
import type { ThemeMode } from '../lib/types'

const STORAGE_KEY = 'timetogether-theme'

function readStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'contrast' ? stored : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])
  return { theme, setTheme }
}
