import type { Theme } from '../types/common'

const STORAGE_KEY = 'theme'

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
    return null
  } catch {
    return null
  }
}

export function initTheme(): Theme {
  const stored = getStoredTheme()
  const theme: Theme = stored ?? 'light'
  applyThemeToDocument(theme)
  return theme
}

export function getTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore write errors; still apply the theme for this session
  }
  applyThemeToDocument(theme)
}


