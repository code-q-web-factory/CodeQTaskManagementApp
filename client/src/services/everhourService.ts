import type { EverhourTaskId, EverhourTimeEntry, EverhourTaskTimeSummary } from '../types/everhour'
import { EverhourApiClient, getAllTimeRecords } from '@levma/everhour-api-client'

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

export class EverhourService {
  private static instance: EverhourService | null = null
  private apiKey: string | null = null
  private client: EverhourApiClient | null = null
  private memo: MemoCache<unknown>

  private constructor() {
    this.memo = new MemoCache<unknown>(60_000)
  }

  static getInstance(): EverhourService {
    if (!EverhourService.instance) EverhourService.instance = new EverhourService()
    return EverhourService.instance
  }

  setApiKey(key: string | null) {
    this.apiKey = key
    this.client = key ? new EverhourApiClient(key) : null
    this.memo.clear()
  }

  getApiKey() {
    return this.apiKey
  }

  private ensureClient(): EverhourApiClient {
    if (!this.client) throw new Error('Everhour API key not set')
    return this.client
  }

  // List time entries, optionally filtered by date range
  async listTimeEntries(params?: { from?: string; to?: string }): Promise<EverhourTimeEntry[]> {
    const from = params?.from
    const to = params?.to
    const key = `getAllTimeRecords:${from ?? ''}:${to ?? ''}`
    const cached = this.memo.get(key) as EverhourTimeEntry[] | undefined
    if (cached) return cached
    const records = await getAllTimeRecords(this.ensureClient(), from, to)
    const entries: EverhourTimeEntry[] = records.map((r) => ({
      id: String(r.id),
      // Ensure task id is always a string to match Asana task gid join keys
      taskId: r.task?.id != null ? String(r.task.id) : null,
      userId: String(r.user),
      time: r.time ?? 0,
      date: r.date,
    }))
    this.memo.set(key, entries)
    return entries
  }

  // Summarize total seconds per task from a set of entries
  summarizeByTask(entries: EverhourTimeEntry[]): EverhourTaskTimeSummary[] {
    const totals = new Map<EverhourTaskId, number>()
    for (const e of entries) {
      if (!e.taskId) continue
      totals.set(e.taskId, (totals.get(e.taskId) ?? 0) + (e.time ?? 0))
    }
    return Array.from(totals.entries()).map(([taskId, totalSeconds]) => ({ taskId, totalSeconds }))
  }
}

export const everhourService = EverhourService.getInstance()


