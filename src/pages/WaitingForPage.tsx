import { useEffect, useMemo, useState } from 'react'
import { asanaService } from '../services/asanaService'
import type { AsanaTask, AsanaWorkspace } from '../types/asana'
import type { NormalizedTask } from '../types/common'
import { TaskCard } from '../components/TaskCard'
import { LoadingMessage } from '../components/ui/LoadingMessage'

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

function isWaitingTitle(t: AsanaTask): boolean {
  const name = (t.name ?? '').trim()
  return name.startsWith('[WARTE AUF ')
}

export default function WaitingForPage() {
  const [workspace, setWorkspace] = useState<AsanaWorkspace | null>(null)
  const [meGid, setMeGid] = useState<string | null>(null)
  const [tasks, setTasks] = useState<NormalizedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const token = asanaService.getToken() ?? localStorage.getItem('asanaToken')
      if (token) await asanaService.setToken(token)
      const workspaces = await asanaService.listWorkspaces()
      setWorkspace(workspaces[0] ?? null)
      const me = await asanaService.getCurrentUser()
      setMeGid(me.gid)
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed initializing Asana'))
  }, [])

  useEffect(() => {
    if (!workspace || !meGid) return
    let cancelled = false
    const farFuture = new Date(2100, 0, 1).toISOString()

    try {
      const cached = asanaService.getCachedTasksOlderThan(workspace.gid, farFuture)
      if (cached) {
        const candidate = cached.filter((t) => t.assignee?.gid === meGid)
        const waiting = candidate.filter((t) => isWaitingTitle(t))
        if (!cancelled) {
          setTasks(waiting.map((t) => normalizeTask(t)))
          setLoading(false)
          setError(null)
        }
        return () => {
          cancelled = true
        }
      }
      setLoading(true)
    } catch {
      setLoading(true)
    }

    ;(async () => {
      try {
        const all = await asanaService.findTasksOlderThan(workspace.gid, farFuture)
        if (cancelled) return
        const candidate = all.filter((t) => t.assignee?.gid === meGid)
        const waiting = candidate.filter((t) => isWaitingTitle(t))
        setTasks(waiting.map((t) => normalizeTask(t)))
        setError(null)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed loading tasks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workspace, meGid])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-base font-semibold text-gray-900">Waiting for…</h1>
        <p className="text-xs text-gray-500">Tasks starting with "[WARTE AUF" assigned to you</p>
      </div>
    ),
    [],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col rounded-none sm:rounded-lg border border-gray-200 shadow-sm bg-white">
        {header}
        <div className="p-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {loading && <LoadingMessage />}
          <div className="mt-3 space-y-3">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
            {!tasks.length && !loading && <div className="text-sm text-gray-500">No tasks found.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}


