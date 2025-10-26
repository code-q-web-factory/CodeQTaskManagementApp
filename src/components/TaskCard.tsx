import type { NormalizedTask } from '../types/common'

export interface TaskCardProps {
  task: NormalizedTask
}

export function TaskCard({ task }: TaskCardProps) {
  const firstName = task.assigneeFirstName ?? ''
  const name = task.assigneeFullName ?? 'Unassigned'
  const emoji = firstName ? '👤' : '❔'
  const hours = (task.timeWorkedSeconds ?? 0) / 3600
  const createdDate = task.createdAt ? new Date(task.createdAt) : null
  const createdLabel = createdDate ? createdDate.toLocaleDateString() : ''

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
          <div className="mt-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="text-base">{emoji}</span>
                <span>{firstName ?? name}</span>
              </span>
              {createdLabel && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <span className="text-base">📅</span>
                  <span>{createdLabel}</span>
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-gray-500">Time worked</div>
          <div className="text-sm font-medium text-gray-900">{hours.toFixed(2)} h</div>
        </div>
      </div>
    </a>
  )
}


