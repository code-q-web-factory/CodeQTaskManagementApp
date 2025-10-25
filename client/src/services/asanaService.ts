import type { AsanaPaginatedResponse, AsanaTask, AsanaWorkspace, AsanaUser } from '../types/asana'
import { EXCLUDED_PROJECT_IDS } from '../config/asana'
// The official asana SDK is CommonJS. Use dynamic import in the browser so we don't rely on require().

// Minimal runtime types for the SDK surface we use (to avoid `any`)
type AsanaClient = {
  authentications: Record<string, { accessToken?: string }>
  RETURN_COLLECTION: boolean
}

type WorkspacesApi = {
  getWorkspaces(params: Record<string, unknown>): Promise<{ data: AsanaWorkspace[] }>
}

type TasksApi = {
  getTasksForProject(
    projectGid: string,
    opts: { limit?: number; offset?: string; opt_fields?: string },
  ): Promise<AsanaPaginatedResponse<AsanaTask>>
}

type ProjectsApi = {
  getProjectsForWorkspace(
    workspaceGid: string,
    opts: { limit?: number },
  ): Promise<{ data: Array<{ gid: string; name: string }>; next_page?: { offset: string } | null }>
}

type UsersApi = {
  getUser(userGid: string, opts: { opt_fields?: string }): Promise<{ data: AsanaUser }>
}

interface AsanaSdk {
  ApiClient: { instance: AsanaClient }
  WorkspacesApi: new () => unknown
  TasksApi: new () => unknown
  ProjectsApi: new () => unknown
  UsersApi: new () => unknown
}

let AsanaSDK: AsanaSdk | null = null
async function getAsanaSdk(): Promise<AsanaSdk> {
  if (AsanaSDK) return AsanaSDK
  const mod = (await import('asana')) as unknown
  const asana = (mod as { default?: unknown })?.default ?? mod
  AsanaSDK = asana as AsanaSdk
  return AsanaSDK
}

// Simple in-memory memoization with TTL per unique request key
class MemoCache<V> {
  private map = new Map<string, { value: V; expiresAt: number }>()
  private ttlMs: number
  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }
  get(key: string): V | undefined {
    const hit = this.map.get(key)
    if (!hit) return undefined
    if (Date.now() > hit.expiresAt) {
      this.map.delete(key)
      return undefined
    }
    return hit.value
  }
  set(key: string, value: V) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }
  clear() {
    this.map.clear()
  }
}

export class AsanaService {
  private static instance: AsanaService | null = null
  private token: string | null = null
  private memo: MemoCache<unknown>
  private memo10Min: MemoCache<unknown>
  private inFlightByKey = new Map<string, Promise<AsanaTask[]>>()
  private workspacesApi: WorkspacesApi | null = null
  private tasksApi: TasksApi | null = null
  private usersApi: UsersApi | null = null

  private constructor() {
    this.memo = new MemoCache<unknown>(60_000)
    this.memo10Min = new MemoCache<unknown>(600_000)
  }

  static getInstance(): AsanaService {
    if (!AsanaService.instance) AsanaService.instance = new AsanaService()
    return AsanaService.instance
  }

  async setToken(token: string | null) {
    this.token = token
    // Configure SDK singleton
    const Asana = await getAsanaSdk()
    const client = Asana.ApiClient.instance
    const auth = client.authentications['token']
    auth.accessToken = token ?? ''
    // Ensure raw response for easier pagination handling
    client.RETURN_COLLECTION = false

    this.workspacesApi = new (Asana.WorkspacesApi as new () => unknown)() as unknown as WorkspacesApi
    this.tasksApi = new (Asana.TasksApi as new () => unknown)() as unknown as TasksApi
    this.usersApi = new (Asana.UsersApi as new () => unknown)() as unknown as UsersApi
    this.memo.clear()
    this.memo10Min.clear()
  }

  getToken() {
    return this.token
  }

  async getCurrentUser(): Promise<AsanaUser> {
    if (!this.usersApi) throw new Error('Asana token not set')
    return this.withMemo('me', async () => {
      const res = await this.usersApi!.getUser('me', { opt_fields: 'gid,name' })
      return res.data
    })
  }

  private async withMemo<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.memo.get(key) as T | undefined
    if (cached) return cached
    const value = await loader()
    this.memo.set(key, value)
    return value
  }

  async listWorkspaces(): Promise<AsanaWorkspace[]> {
    if (!this.workspacesApi) throw new Error('Asana token not set')
    return this.withMemo('workspaces', async () => {
      const res = await this.workspacesApi!.getWorkspaces({})
      return res.data
    })
  }

  // Free plan alternative: enumerate projects and tasks, then filter by created_at
  async findTasksOlderThan(workspaceGid: string, isoDate: string): Promise<AsanaTask[]> {
    if (!this.tasksApi) throw new Error('Asana token not set')
    const memKey = this.cacheKeyOlderThan(workspaceGid, isoDate)
    const memHit = this.memo10Min.get(memKey) as AsanaTask[] | undefined
    if (memHit) return memHit
    const inflight = this.inFlightByKey.get(memKey)
    if (inflight) return inflight
    const Asana = await getAsanaSdk()
    const projectsApi = new (Asana.ProjectsApi as new () => unknown)() as unknown as ProjectsApi
    const opt_fields = [
      'gid',
      'name',
      'created_at',
      'permalink_url',
      'assignee.gid',
      'assignee.name',
      'completed',
      // include memberships to read section/column names
      'memberships.section.name',
      'memberships.section.gid',
      'memberships.project.gid',
      'memberships.project.name',
      // include tags for filtering
      'tags.gid',
      'tags.name',
    ].join(',')

    // persistent cache (10 minutes)
    const storageKey = this.cacheKeyOlderThan(workspaceGid, isoDate)
    const persisted = this.persistentGet<AsanaTask[]>(storageKey, 600_000)
    if (persisted) {
      // Always dedupe persisted results in case older versions cached duplicates
      const dedupedPersisted = this.dedupeTasksById(persisted)
      this.memo10Min.set(memKey, dedupedPersisted)
      return dedupedPersisted
    }

    const projectsKey = `workspace-projects:${workspaceGid}`
    const projects = await this.withMemo(projectsKey, async () => {
      const res = await projectsApi.getProjectsForWorkspace(workspaceGid, { limit: 100 })
      return res.data
    })

    const promise = (async () => {
      const results: AsanaTask[] = []
      for (const project of projects) {
        if (EXCLUDED_PROJECT_IDS.has(project.gid)) continue
        let offset: string | undefined
        do {
          const page = await this.tasksApi!.getTasksForProject(project.gid, {
            limit: 100,
            offset,
            opt_fields,
          })
          for (const t of page.data) {
            if (t.created_at && new Date(t.created_at) < new Date(isoDate)) results.push(t)
          }
          offset = page.next_page?.offset
        } while (offset)
      }
      const deduped = this.dedupeTasksById(results)
      this.persistentSet(storageKey, deduped)
      this.memo10Min.set(memKey, deduped)
      return deduped
    })()
    this.inFlightByKey.set(memKey, promise)
    try {
      return await promise
    } finally {
      this.inFlightByKey.delete(memKey)
    }
  }

  // Returns cached result for findTasksOlderThan if available and fresh; otherwise null
  getCachedTasksOlderThan(workspaceGid: string, isoDate: string): AsanaTask[] | null {
    const storageKey = this.cacheKeyOlderThan(workspaceGid, isoDate)
    const cached = this.persistentGet<AsanaTask[]>(storageKey, 600_000)
    return cached ? this.dedupeTasksById(cached) : null
  }

  // Return in-memory cached result if available (10 minutes TTL), else null
  getMemoizedTasksOlderThan(workspaceGid: string, isoDate: string): AsanaTask[] | null {
    const memKey = this.cacheKeyOlderThan(workspaceGid, isoDate)
    const mem = this.memo10Min.get(memKey) as AsanaTask[] | undefined
    return mem ?? null
  }

  // ----- persistent cache helpers -----
  private cacheKeyOlderThan(workspaceGid: string, isoDate: string): string {
    return `aqm:v2:asana:olderThan:${workspaceGid}:${isoDate}`
  }

  private persistentGet<T>(key: string, ttlMs: number): T | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { ts: number; data: T }
      if (typeof parsed.ts !== 'number') return null
      if (Date.now() - parsed.ts > ttlMs) return null
      return parsed.data
    } catch {
      return null
    }
  }

  private persistentSet<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: value }))
    } catch {
      // ignore quota / serialization errors
    }
  }

  clearPersistentCache(): void {
    try {
      const prefixes = ['aqm:asana:olderThan:', 'aqm:v2:asana:olderThan:']
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && prefixes.some((p) => k.startsWith(p))) localStorage.removeItem(k)
      }
    } catch {
      // ignore
    }
    this.memo.clear()
  }

  // ---- helpers ----
  private dedupeTasksById(tasks: AsanaTask[]): AsanaTask[] {
    const byId = new Map<string, AsanaTask>()
    for (const t of tasks) {
      const existing = byId.get(t.gid)
      if (!existing) {
        // Clone shallowly to avoid mutating the source array
        byId.set(t.gid, {
          ...t,
          memberships: t.memberships ? [...t.memberships] : undefined,
          tags: t.tags ? [...t.tags] : undefined,
        })
        continue
      }
      // Merge memberships, keeping unique project+section combinations
      const mergedMemberships: NonNullable<AsanaTask['memberships']> = []
      const pushUnique = (m?: AsanaTask['memberships']) => {
        if (!m) return
        for (const item of m) {
          const key = `${item.project?.gid ?? ''}:${item.section?.gid ?? ''}`
          if (!mergedMemberships.some((x) => `${x.project?.gid ?? ''}:${x.section?.gid ?? ''}` === key)) {
            mergedMemberships.push(item)
          }
        }
      }
      pushUnique(existing.memberships)
      pushUnique(t.memberships)

      existing.memberships = mergedMemberships.length ? mergedMemberships : existing.memberships ?? t.memberships
      // Merge tags uniquely by gid
      const mergedTags: NonNullable<AsanaTask['tags']> = []
      const pushUniqueTags = (arr?: AsanaTask['tags']) => {
        if (!arr) return
        for (const tag of arr) {
          if (!mergedTags.some((x) => x.gid === tag.gid)) mergedTags.push(tag)
        }
      }
      pushUniqueTags(existing.tags)
      pushUniqueTags(t.tags)
      existing.tags = mergedTags.length ? mergedTags : existing.tags ?? t.tags
      // Prefer non-null assignee/completed when missing on the existing record
      if (!existing.assignee && t.assignee) existing.assignee = t.assignee
      if (existing.completed === undefined && t.completed !== undefined) existing.completed = t.completed
      // Keep earliest created_at just in case
      if (existing.created_at && t.created_at && new Date(t.created_at) < new Date(existing.created_at)) {
        existing.created_at = t.created_at
      }
    }
    return Array.from(byId.values())
  }
}

export const asanaService = AsanaService.getInstance()


