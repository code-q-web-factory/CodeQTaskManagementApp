import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { FOCUSED_WORK_PRESETS, EXCLUDED_TAG_IDS } from '../config/asana'
import { asanaService } from '../services/asanaService'
import type { AsanaTask, AsanaWorkspace } from '../types/asana'
import type { NormalizedTask } from '../types/common'
import { TaskCard } from '../components/TaskCard'

type PresetKey = keyof typeof FOCUSED_WORK_PRESETS | 'Code Q Delegated'

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
  const [delegatedTasks, setDelegatedTasks] = useState<NormalizedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<AsanaWorkspace | null>(null)
  const [meGid, setMeGid] = useState<string | null>(null)

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
    if (!selectedPreset || !workspace || !meGid) return
    const projectIds =
      selectedPreset in FOCUSED_WORK_PRESETS
        ? FOCUSED_WORK_PRESETS[selectedPreset as keyof typeof FOCUSED_WORK_PRESETS]
        : []
    const isOther = selectedPreset === 'Other'
    const isDelegated = selectedPreset === 'Code Q Delegated'
    if (!isOther && !isDelegated && (!projectIds || projectIds.length === 0)) {
      setTasks([])
      setDelegatedTasks([])
      return
    }

    let cancelled = false
    const farFuture = new Date(2100, 0, 1).toISOString()

    // 1) Instant read from persistent cache if available
    try {
      const cachedAll = asanaService.getCachedTasksOlderThan(workspace.gid, farFuture)
      if (cachedAll) {
        setError(null)
        const candidate = cachedAll.filter((t) => t.assignee?.gid === meGid)
        const isExcludedByTag = (t: AsanaTask): boolean => {
          const tags = t.tags ?? []
          return tags.some((tag) => EXCLUDED_TAG_IDS.has(tag.gid))
        }
        const allCurated = new Set(
          Object.entries(FOCUSED_WORK_PRESETS)
            .filter(([k]) => k !== 'Other')
            .flatMap(([, ids]) => ids),
        )
        const filtered = isOther
          ? candidate
              .filter((t) => !t.memberships?.some((m) => m.project && allCurated.has(m.project.gid)))
              .filter((t) => !isExcludedByTag(t))
          : isDelegated
          ? candidate.filter((t) => isExcludedByTag(t))
          : candidate
              .filter((t) => t.memberships?.some((m) => m.project && projectIds.includes(m.project.gid)))
              .filter((t) => !isExcludedByTag(t))
        if (!cancelled) {
          if (isDelegated) {
            setDelegatedTasks(filtered.map((t) => normalizeTask(t)))
            setTasks([])
          } else {
            setTasks(filtered.map((t) => normalizeTask(t)))
            setDelegatedTasks([])
          }
          setLoading(false)
          setRefreshing(false)
        }
        // Fresh cache within 10 minutes: skip network entirely
        return () => {
          cancelled = true
        }
      }
      setLoading(true)
      setRefreshing(false)
    } catch {
      // Ignore cache read errors and continue to network
      setLoading(true)
      setRefreshing(false)
    }

    // 2) Fetch when no fresh cache exists
    ;(async () => {
      try {
        const all = await asanaService.findTasksOlderThan(workspace.gid, farFuture)
        if (cancelled) return
        const candidate = all.filter((t) => t.assignee?.gid === meGid)
        const isExcludedByTag = (t: AsanaTask): boolean => {
          const tags = t.tags ?? []
          return tags.some((tag) => EXCLUDED_TAG_IDS.has(tag.gid))
        }
        const allCurated = new Set(
          Object.entries(FOCUSED_WORK_PRESETS)
            .filter(([k]) => k !== 'Other')
            .flatMap(([, ids]) => ids),
        )
        const filtered = isOther
          ? candidate
              .filter((t) => !t.memberships?.some((m) => m.project && allCurated.has(m.project.gid)))
              .filter((t) => !isExcludedByTag(t))
          : isDelegated
          ? candidate.filter((t) => isExcludedByTag(t))
          : candidate
              .filter((t) => t.memberships?.some((m) => m.project && projectIds.includes(m.project.gid)))
              .filter((t) => !isExcludedByTag(t))
        if (isDelegated) {
          setDelegatedTasks(filtered.map((t) => normalizeTask(t)))
          setTasks([])
        } else {
          setTasks(filtered.map((t) => normalizeTask(t)))
          setDelegatedTasks([])
        }
        setError(null)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed loading tasks')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedPreset, workspace, meGid])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-base font-semibold text-gray-900">Focused Work</h1>
        <p className="text-xs text-gray-500">Pick a focus area to see your tasks</p>
      </div>
    ),
    [],
  )

  const presetKeys: PresetKey[] = [
    ...(Object.keys(FOCUSED_WORK_PRESETS) as (keyof typeof FOCUSED_WORK_PRESETS)[]),
    'Code Q Delegated',
  ]
  const buttons = presetKeys.map((key) => (
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
          {!loading && refreshing && (
            <div className="mt-4 text-xs text-gray-500">Refreshing…</div>
          )}

          {selectedPreset && selectedPreset !== 'Code Q Delegated' && (
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

          {selectedPreset === 'Code Q Delegated' && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-gray-800">Code Q Delegated</h2>
              <div className="mt-3 space-y-3">
                {delegatedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
                {!delegatedTasks.length && !loading && (
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


