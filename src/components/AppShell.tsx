import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import type { Theme } from '../types/common'
import { initTheme, setTheme } from '../services/themeService'
import { ThemeToggle } from './ui/ThemeToggle'

export interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation()
  const [theme, setThemeState] = useState<Theme>('light')
  useEffect(() => {
    setThemeState(initTheme())
  }, [])
  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    setTheme(next)
  }
  const items = [
    { to: '/critical', label: 'Critical' },
    { to: '/focused', label: 'Focused Work' },
    { to: '/waiting', label: 'Waiting for…' },
    { to: '/settings', label: 'Settings' },
  ]
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="font-semibold">Code Q Management</div>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={clsx(
                  'rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-900',
                  pathname === it.to
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300',
                )}
              >
                {it.label}
              </Link>
            ))}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}


