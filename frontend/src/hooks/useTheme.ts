import { useEffect, useState } from 'react'
import type { ThemeMode } from '../lib/types'

const STORAGE_KEY = 'timetogether-theme'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'telegram',
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])
  return { theme, setTheme }
}
