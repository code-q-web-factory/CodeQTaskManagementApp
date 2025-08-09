import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

export interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation()
  const items = [
    { to: '/critical', label: 'Critical' },
    { to: '/focused', label: 'Focused Work' },
    { to: '/settings', label: 'Settings' },
  ]
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="font-semibold">Code Q Management</div>
          <nav className="flex items-center gap-4 text-sm">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={clsx(
                  'rounded-md px-2 py-1 hover:bg-gray-100',
                  pathname === it.to ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                )}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}


