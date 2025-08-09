// Type definitions for Everhour data we consume

export type EverhourTaskId = string

export interface EverhourTimeEntry {
  id: string
  taskId: EverhourTaskId | null
  userId: string
  time: number // seconds
  date: string // YYYY-MM-DD
}

export interface EverhourTaskTimeSummary {
  taskId: EverhourTaskId
  totalSeconds: number
}


