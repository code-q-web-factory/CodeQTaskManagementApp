import type { HTMLAttributes } from 'react'
import type { Theme } from '../../types/common'
import { Button } from './button'

export interface ThemeToggleProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle, className, ...props }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <Button
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={className}
      {...props as any}
    >
      {isDark ? '🌙' : '☀️'}
    </Button>
  )
}


