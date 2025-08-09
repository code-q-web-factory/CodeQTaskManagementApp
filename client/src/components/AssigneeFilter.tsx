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
      <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
      <select
        value={value}
        onChange={handleChange}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
      >
        <option value="ALL">All assignees</option>
        {includeUnassigned && <option value="UNASSIGNED">Unassigned</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}


