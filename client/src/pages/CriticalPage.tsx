import { useEffect, useMemo, useState } from 'react'
import { asanaService } from '../services/asanaService'
import { everhourService } from '../services/everhourService'
import type { AsanaTask, AsanaWorkspace } from '../types/asana'
import type { NormalizedTask } from '../types/common'
import { TaskCard } from '../components/TaskCard'
import { AssigneeFilter, type AssigneeFilterValue } from '../components/AssigneeFilter.tsx'

function toISODate(d: Date) {
  return d.toISOString()
}

function firstName(full: string | null): string | null {
  if (!full) return null
  const [first] = full.split(' ')
  return first || null
}

function isInMaybeLater(task: AsanaTask): boolean {
  const memberships = task.memberships ?? []
  for (const m of memberships) {
    const name = m.section?.name?.trim().toLowerCase()
    if (name === 'maybe later') return true
  }
  return false
}

function normalizeTask(t: AsanaTask, timeWorkedSeconds?: number): NormalizedTask {
  return {
    id: t.gid,
    title: t.name,
    createdAt: t.created_at,
    url: t.permalink_url,
    assigneeFirstName: firstName(t.assignee?.name ?? null),
    assigneeFullName: t.assignee?.name ?? null,
    assigneeId: t.assignee?.gid ?? null,
    timeWorkedSeconds: timeWorkedSeconds ?? 0,
  }
}

export default function CriticalPage() {
  const [/* workspace */, setWorkspace] = useState<AsanaWorkspace | null>(null)
  const [olderThanSixMonths, setOlderThanSixMonths] = useState<NormalizedTask[]>([])
  const [olderThanOneMonthSpentHour, setOlderThanOneMonthSpentHour] = useState<NormalizedTask[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokensReady, setTokensReady] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<AssigneeFilterValue>('ALL')

  useEffect(() => {
    // initialize tokens from localStorage on first load
    ;(async () => {
      const asanaToken = localStorage.getItem('asanaToken')
      everhourService.setApiKey(localStorage.getItem('everhourKey'))
      if (asanaToken) {
        await asanaService.setToken(asanaToken)
      }
      setTokensReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!tokensReady) return
    const asanaToken = localStorage.getItem('asanaToken')
    if (!asanaToken) {
      setError('Please set your Asana token in Settings first.')
      return
    }
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const workspaces = await asanaService.listWorkspaces()
        if (!workspaces.length) throw new Error('No Asana workspaces available')
        setWorkspace(workspaces[0])

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const [asanaOldSixM, asanaOldOneM, entries] = await Promise.all([
          asanaService.findTasksOlderThan(workspaces[0].gid, toISODate(sixMonthsAgo)),
          asanaService.findTasksOlderThan(workspaces[0].gid, toISODate(oneMonthAgo)),
          (async () => {
            try {
              return await everhourService.listTimeEntries({})
            } catch {
              // Graceful degradation if Everhour key is missing
              return []
            }
          })(),
        ])

        const byTask = new Map(entries.filter((e) => e.taskId).map((e) => [e.taskId!, 0]))
        for (const e of entries) {
          if (!e.taskId) continue
          byTask.set(e.taskId, (byTask.get(e.taskId) ?? 0) + (e.time ?? 0))
        }

        const olderSixNorm = asanaOldSixM
          .filter((t) => !t.completed && !isInMaybeLater(t))
          .map((t) => normalizeTask(t, byTask.get(t.gid)))
          // Deduplicate normalized tasks by id to avoid duplicate keys in render
          .reduce<NormalizedTask[]>((acc, cur) => {
            if (!acc.some((x) => x.id === cur.id)) acc.push(cur)
            return acc
          }, [])
        setOlderThanSixMonths(olderSixNorm)

        const olderOneNorm = asanaOldOneM
          .filter((t) => !t.completed && !isInMaybeLater(t))
          .map((t) => normalizeTask(t, byTask.get(t.gid)))
          .filter((t) => (t.timeWorkedSeconds ?? 0) > 3600)
          .reduce<NormalizedTask[]>((acc, cur) => {
            if (!acc.some((x) => x.id === cur.id)) acc.push(cur)
            return acc
          }, [])
        setOlderThanOneMonthSpentHour(olderOneNorm)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed loading data'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [tokensReady])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-base font-semibold text-gray-900">Critical</h1>
        <p className="text-xs text-gray-500">Code Q Management</p>
      </div>
    ),
    [],
  )

  const assigneeOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const t of olderThanSixMonths) {
      if (t.assigneeId && t.assigneeFullName) byId.set(t.assigneeId, t.assigneeFullName)
    }
    for (const t of olderThanOneMonthSpentHour) {
      if (t.assigneeId && t.assigneeFullName) byId.set(t.assigneeId, t.assigneeFullName)
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [olderThanSixMonths, olderThanOneMonthSpentHour])

  function matchesAssignee(task: NormalizedTask, value: AssigneeFilterValue): boolean {
    if (value === 'ALL') return true
    if (value === 'UNASSIGNED') return !task.assigneeId
    return task.assigneeId === value
  }

  const filteredOlderThanSixMonths = useMemo(
    () => olderThanSixMonths.filter((t) => matchesAssignee(t, selectedAssignee)),
    [olderThanSixMonths, selectedAssignee],
  )

  const filteredOlderThanOneMonth = useMemo(
    () => olderThanOneMonthSpentHour.filter((t) => matchesAssignee(t, selectedAssignee)),
    [olderThanOneMonthSpentHour, selectedAssignee],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col rounded-none sm:rounded-lg border border-gray-200 shadow-sm bg-white">
        {header}
        <div className="p-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {loading && <div className="text-sm text-gray-600">Loading…</div>}

          <div className="mb-4">
            <AssigneeFilter
              options={assigneeOptions}
              value={selectedAssignee}
              onChange={setSelectedAssignee}
              includeUnassigned
            />
          </div>

          <section className="mt-2">
            <h2 className="text-sm font-semibold text-gray-800">Tasks older than six months</h2>
            <div className="mt-3 space-y-3">
              {filteredOlderThanSixMonths.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
              {!filteredOlderThanSixMonths.length && !loading && (
                <div className="text-sm text-gray-500">No tasks found.</div>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-gray-800">Tasks older than one month with more than one hour spent</h2>
            <div className="mt-3 space-y-3">
              {filteredOlderThanOneMonth.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
              {!filteredOlderThanOneMonth.length && !loading && (
                <div className="text-sm text-gray-500">No tasks found.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}


