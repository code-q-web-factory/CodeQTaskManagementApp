import type { ChangeEvent } from 'react'

export type AssigneeFilterValue = 'ALL' | 'UNASSIGNED' | string

export interface AssigneeOption {
  id: string
  name: string
}

export interface AssigneeFilterProps {
  options: AssigneeOption[]
  value: AssigneeFilterValue
  onChange: (value: AssigneeFilterValue) => void
  includeUnassigned?: boolean
  className?: string
}

export function AssigneeFilter({
  options,
  value,
  onChange,
  includeUnassigned = true,
  className,
}: AssigneeFilterProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as AssigneeFilterValue
    onChange(val)
  }

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Assignee</label>
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          className="block w-full appearance-none rounded-md border border-gray-300 bg-white pr-8 pl-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-100"
        >
          <option value="ALL">All assignees</option>
          {includeUnassigned && <option value="UNASSIGNED">Unassigned</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}


