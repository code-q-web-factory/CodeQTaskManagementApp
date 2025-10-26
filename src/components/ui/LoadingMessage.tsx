import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export type LoadingMessageProps = HTMLAttributes<HTMLDivElement>

export function LoadingMessage({ className, ...props }: LoadingMessageProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-gray-700', className)} {...props}>
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 animate-spin text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-sm font-medium">Loading</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">This can take up to one minute.</p>
    </div>
  )
}


