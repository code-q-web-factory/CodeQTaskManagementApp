import type { NormalizedTask } from '../types/common'

let asanaWindowRef: Window | null = null

export interface TaskCardProps {
  task: NormalizedTask
}

export function TaskCard({ task }: TaskCardProps) {
  const firstName = task.assigneeFirstName ?? ''
  const name = task.assigneeFullName ?? 'Unassigned'
  const emoji = firstName ? '👤' : '❔'
  const timeWorkedSeconds = task.timeWorkedSeconds ?? 0
  const totalMinutes = Math.floor(timeWorkedSeconds / 60)
  const displayHours = Math.floor(totalMinutes / 60)
  const displayMinutes = totalMinutes % 60
  const createdDate = task.createdAt ? new Date(task.createdAt) : null
  const createdLabel = createdDate ? createdDate.toLocaleDateString() : ''
  const targetTabName = 'code-q-management-asana-tab'

  return (
    <a
      href={task.url}
      target={targetTabName}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:border-gray-800 dark:bg-gray-900"
      onClick={(e) => {
        e.preventDefault()
        if (asanaWindowRef && !asanaWindowRef.closed) {
          asanaWindowRef.location.href = task.url
          asanaWindowRef.focus()
        } else {
          asanaWindowRef = window.open(task.url, targetTabName) as Window | null
          asanaWindowRef?.focus()
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{task.title}</h3>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="text-base">{emoji}</span>
                <span>{firstName ?? name}</span>
              </span>
              {createdLabel && (
                <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span className="text-base">📅</span>
                  <span>{createdLabel}</span>
                </span>
              )}
            </span>
          </div>
        </div>
        {timeWorkedSeconds > 0 && (
          <div className="text-right">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Time worked</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${displayHours}h ${displayMinutes}m`}</div>
          </div>
        )}
      </div>
    </a>
  )
}


