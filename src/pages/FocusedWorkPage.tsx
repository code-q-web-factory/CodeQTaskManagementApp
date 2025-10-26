import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { EXCLUDED_TAG_IDS } from '../config/asana'
import { asanaService } from '../services/asanaService'
import { everhourService } from '../services/everhourService'
import type { AsanaTask, AsanaWorkspace } from '../types/asana'
import type { NormalizedTask, FocusedTabConfig, FocusedTabsConfig } from '../types/common'
import { TaskCard } from '../components/TaskCard'
import { ProjectSection } from '../components/ProjectSection.tsx'
import { LoadingMessage } from '../components/ui/LoadingMessage'
import { settingsService } from '../services/settingsService'

type SelectedTabId = string | 'Other' | null

function firstName(full: string | null): string | null {
  if (!full) return null
  const [first] = full.split(' ')
  return first || null
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
    projects: (t.memberships ?? [])
      .map((m) => m.project)
      .filter((p): p is { gid: string; name: string } => !!p)
      .reduce<Array<{ id: string; name: string }>>((acc, p) => {
        if (!acc.some((x) => x.id === p.gid)) acc.push({ id: p.gid, name: p.name })
        return acc
      }, []),
  }
}

function isWaitingTitle(t: AsanaTask): boolean {
  const name = (t.name ?? '').trim()
  return name.startsWith('[WARTE AUF ')
}

export default function FocusedWorkPage() {
  const [selectedTabId, setSelectedTabId] = useState<SelectedTabId>(null)
  const [tasks, setTasks] = useState<NormalizedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<AsanaWorkspace | null>(null)
  const [meGid, setMeGid] = useState<string | null>(null)
  const [tabsCfg, setTabsCfg] = useState<FocusedTabsConfig | null>(null)

  useEffect(() => {
    ;(async () => {
      const token = asanaService.getToken() ?? localStorage.getItem('asanaToken')
      if (token) await asanaService.setToken(token)
      // Initialize Everhour key if present so we can load time entries
      try {
        const ehKey = localStorage.getItem('everhourKey')
        everhourService.setApiKey(ehKey)
      } catch {}
      const workspaces = await asanaService.listWorkspaces()
      setWorkspace(workspaces[0] ?? null)
      const me = await asanaService.getCurrentUser()
      setMeGid(me.gid)
      // Load focused tabs config
      setTabsCfg(settingsService.getFocusedTabs())
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed initializing Asana'))
  }, [])

  // Select a default tab once tabs are available
  useEffect(() => {
    if (selectedTabId) return
    if (tabsCfg) setSelectedTabId(tabsCfg.tabs[0]?.id ?? 'Other')
  }, [tabsCfg, selectedTabId])

  useEffect(() => {
    if (!selectedTabId || !workspace || !meGid || !tabsCfg) return
    const isOther = selectedTabId === 'Other'
    const currentTab: FocusedTabConfig | null = isOther ? null : (tabsCfg.tabs.find((t) => t.id === selectedTabId) ?? null)
    if (!isOther && !currentTab) {
      setTasks([])
      return
    }

    let cancelled = false
    const farFuture = new Date(2100, 0, 1).toISOString()

    // Helper to fetch Everhour and build map of seconds by Asana task gid
    const loadEverhourMap = async (): Promise<Map<string, number>> => {
      try {
        const from = new Date()
        from.setMonth(from.getMonth() - 6)
        const fromStr = from.toISOString().slice(0, 10)
        const toStr = new Date().toISOString().slice(0, 10)
        const entries = await everhourService.listTimeEntries({ from: fromStr, to: toStr })
        const byTask = new Map<string, number>()
        const extractAsanaTaskGidFromEverhourTaskUrl = (url: string | null | undefined): string | null => {
          if (!url) return null
          try {
            const u = new URL(url)
            if (!u.hostname.includes('asana.com')) return null
            const parts = u.pathname.split('/').filter(Boolean)
            for (let i = parts.length - 1; i >= 0; i--) {
              const seg = parts[i]
              if (/^\d{10,}$/.test(seg)) return seg
            }
            return null
          } catch {
            return null
          }
        }
        const looksLikeAsanaGid = (id: string | null | undefined): id is string => !!id && /^\d{10,}$/.test(id)
        for (const e of entries) {
          const gidFromUrl = extractAsanaTaskGidFromEverhourTaskUrl(e.taskUrl ?? null)
          const candidate = gidFromUrl ?? (looksLikeAsanaGid(e.taskId) ? e.taskId! : null)
          if (!candidate) continue
          byTask.set(candidate, (byTask.get(candidate) ?? 0) + (e.time ?? 0))
        }
        return byTask
      } catch (e) {
        console.warn('[FocusedWorkPage] Everhour load failed, proceeding without time', e)
        return new Map<string, number>()
      }
    }

    const matchesTab = (task: AsanaTask, tab: FocusedTabConfig): boolean => {
      const memberships = task.memberships ?? []
      const projectMatch = tab.projectIds.length
        ? memberships.some((m) => m.project && tab.projectIds.includes(m.project.gid))
        : true
      const tagIds = (task.tags ?? []).map((t) => t.gid)
      const includeMatch = tab.includeTagIds.length ? tab.includeTagIds.some((id) => tagIds.includes(id)) : true
      const excludeMatch = tab.excludeTagIds.length ? !tab.excludeTagIds.some((id) => tagIds.includes(id)) : true
      return projectMatch && includeMatch && excludeMatch
    }

    const matchesAnyConfiguredTab = (task: AsanaTask): boolean => {
      return tabsCfg.tabs.some((t) => matchesTab(task, t))
    }

    // 1) Instant read from persistent cache if available
    try {
      const cachedAll = asanaService.getCachedTasksOlderThan(workspace.gid, farFuture)
      if (cachedAll) {
        setError(null)
        const candidate = cachedAll.filter((t) => t.assignee?.gid === meGid)
        const hasExcludedTag = (t: AsanaTask): boolean => (t.tags ?? []).some((tag) => EXCLUDED_TAG_IDS.has(tag.gid))
        const filtered = isOther
          ? candidate.filter((t) => !matchesAnyConfiguredTab(t)).filter((t) => !hasExcludedTag(t)).filter((t) => !isWaitingTitle(t))
          : candidate.filter((t) => currentTab ? matchesTab(t, currentTab) : false).filter((t) => !isWaitingTitle(t))
        if (!cancelled) {
          // First render quickly without time
          setTasks(filtered.map((t) => normalizeTask(t)))
          setLoading(false)
          setRefreshing(false)
          // Then enrich with Everhour times asynchronously
          ;(async () => {
            const byTask = await loadEverhourMap()
            if (cancelled) return
            setTasks(filtered.map((t) => normalizeTask(t, byTask.get(t.gid))))
          })()
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
        const [all, byTask] = await Promise.all([
          asanaService.findTasksOlderThan(workspace.gid, farFuture),
          loadEverhourMap(),
        ])
        if (cancelled) return
        const candidate = all.filter((t) => t.assignee?.gid === meGid)
        const hasExcludedTag = (t: AsanaTask): boolean => (t.tags ?? []).some((tag) => EXCLUDED_TAG_IDS.has(tag.gid))
        const filtered = isOther
          ? candidate.filter((t) => !matchesAnyConfiguredTab(t)).filter((t) => !hasExcludedTag(t)).filter((t) => !isWaitingTitle(t))
          : candidate.filter((t) => currentTab ? matchesTab(t, currentTab) : false).filter((t) => !isWaitingTitle(t))
        setTasks(filtered.map((t) => normalizeTask(t, byTask.get(t.gid))))
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
  }, [selectedTabId, workspace, meGid, tabsCfg])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Focused Work</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Pick a focus area to see your tasks</p>
      </div>
    ),
    [],
  )

  const availableTabs: Array<{ id: SelectedTabId; label: string }> = [
    ...(tabsCfg?.tabs.map((t) => ({ id: t.id as SelectedTabId, label: t.label })) ?? []),
    { id: 'Other', label: 'Other' },
  ]
  const buttons = availableTabs.map((t) => (
    <Button
      key={`${t.id}`}
      variant={selectedTabId === t.id ? 'default' : 'secondary'}
      onClick={() => setSelectedTabId(t.id)}
      className="w-full sm:w-auto"
    >
      {t.label}
    </Button>
  ))

  // Group tasks by project for display
  const groups = useMemo(() => {
    if (!selectedTabId) return [] as Array<{ id: string; name: string; tasks: NormalizedTask[] }>
    const source = tasks
    const isOther = selectedTabId === 'Other'
    const currentTab: FocusedTabConfig | null = isOther ? null : (tabsCfg?.tabs.find((t) => t.id === selectedTabId) ?? null)
    const allowed = currentTab && currentTab.projectIds.length ? new Set(currentTab.projectIds) : null

    const map = new Map<string, { id: string; name: string; tasks: NormalizedTask[] }>()
    for (const task of source) {
      let memberships = task.projects ?? []
      if (!memberships.length) memberships = [{ id: 'none', name: 'No project' }]
      const effective = allowed ? memberships.filter((p) => allowed.has(p.id)) : memberships
      for (const proj of effective) {
        const entry = map.get(proj.id) ?? { id: proj.id, name: proj.name, tasks: [] }
        entry.tasks.push(task)
        map.set(proj.id, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedTabId, tasks, tabsCfg])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[var(--color-gray-950)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col rounded-none sm:rounded-lg border border-gray-200 shadow-sm bg-white dark:border-gray-800 dark:bg-gray-950">
        {header}
        <div className="p-4">
          <div className="flex flex-wrap gap-2">{buttons}</div>
          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">{error}</div>
          )}
          {loading && <LoadingMessage className="mt-4" />}
          {!loading && refreshing && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">Refreshing…</div>
          )}

          {selectedTabId && (
            <div className="mt-6 space-y-8">
              {groups.map((g) => (
                <ProjectSection key={g.id} title={g.name}>
                  <div className="mt-3 space-y-3">
                    {g.tasks.map((t) => (
                      <TaskCard key={`${g.id}:${t.id}`} task={t} />
                    ))}
                  </div>
                </ProjectSection>
              ))}
              {!groups.length && !loading && (
                <div className="text-sm text-gray-500 dark:text-gray-400">No tasks found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


