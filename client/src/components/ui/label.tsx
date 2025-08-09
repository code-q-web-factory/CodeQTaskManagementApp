import { type LabelHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return <label className={clsx('text-sm font-medium text-gray-800', className)} {...props} />
}


