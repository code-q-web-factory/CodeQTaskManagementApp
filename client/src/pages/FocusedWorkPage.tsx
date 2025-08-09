import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { FOCUSED_WORK_PRESETS } from '../config/asana'
import { asanaService } from '../services/asanaService'
import type { AsanaTask, AsanaWorkspace } from '../types/asana'
import type { NormalizedTask } from '../types/common'
import { TaskCard } from '../components/TaskCard'

type PresetKey = keyof typeof FOCUSED_WORK_PRESETS

function firstName(full: string | null): string | null {
  if (!full) return null
  const [first] = full.split(' ')
  return first || null
}

function normalizeTask(t: AsanaTask): NormalizedTask {
  return {
    id: t.gid,
    title: t.name,
    createdAt: t.created_at,
    url: t.permalink_url,
    assigneeFirstName: firstName(t.assignee?.name ?? null),
    assigneeFullName: t.assignee?.name ?? null,
    assigneeId: t.assignee?.gid ?? null,
  }
}

export default function FocusedWorkPage() {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null)
  const [tasks, setTasks] = useState<NormalizedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<AsanaWorkspace | null>(null)

  useEffect(() => {
    ;(async () => {
      const token = asanaService.getToken() ?? localStorage.getItem('asanaToken')
      if (token) await asanaService.setToken(token)
      const workspaces = await asanaService.listWorkspaces()
      setWorkspace(workspaces[0] ?? null)
    })().catch((e: any) => setError(e?.message ?? 'Failed initializing Asana'))
  }, [])

  useEffect(() => {
    if (!selectedPreset || !workspace) return
    const projectIds = FOCUSED_WORK_PRESETS[selectedPreset]
    if (!projectIds || projectIds.length === 0) {
      setTasks([])
      return
    }
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        // Reuse findTasksOlderThan to enumerate all tasks via project listing. Pass a far-future date
        // so that all tasks (created before that date) are included.
        const farFuture = new Date(2100, 0, 1).toISOString()
        const all = await asanaService.findTasksOlderThan(workspace.gid, farFuture)
        const candidate = all.filter((t) => t.assignee?.name?.includes('Roland Schütz'))
        const filtered = candidate.filter((t) => t.memberships?.some((m) => m.project && projectIds.includes(m.project.gid)))
        setTasks(filtered.map((t) => normalizeTask(t)))
      } catch (e: any) {
        setError(e?.message ?? 'Failed loading tasks')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [selectedPreset, workspace])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-base font-semibold text-gray-900">Focused Work</h1>
        <p className="text-xs text-gray-500">Pick a focus area to see your tasks</p>
      </div>
    ),
    [],
  )

  const buttons = (Object.keys(FOCUSED_WORK_PRESETS) as PresetKey[]).map((key) => (
    <Button
      key={key}
      variant={selectedPreset === key ? 'default' : 'secondary'}
      onClick={() => setSelectedPreset(key)}
      className="w-full sm:w-auto"
    >
      {key}
    </Button>
  ))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col rounded-none sm:rounded-lg border border-gray-200 shadow-sm bg-white">
        {header}
        <div className="p-4">
          <div className="flex flex-wrap gap-2">{buttons}</div>
          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {loading && <div className="mt-4 text-sm text-gray-600">Loading…</div>}

          {selectedPreset && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-gray-800">Tasks for {selectedPreset}</h2>
              <div className="mt-3 space-y-3">
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
                {!tasks.length && !loading && (
                  <div className="text-sm text-gray-500">No tasks found.</div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}


