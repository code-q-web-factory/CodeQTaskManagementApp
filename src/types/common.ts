// Normalized domain types used by presentational components

export type Theme = 'light' | 'dark'

export interface NormalizedTask {
  id: string
  title: string
  createdAt: string
  url: string
  // Full name and first name of the assignee for display and filtering
  assigneeFirstName: string | null
  assigneeFullName: string | null
  // Optional assignee id for potential future filtering/joins
  assigneeId?: string | null
  timeWorkedSeconds?: number
  // Projects this task belongs to, used for grouping in UI
  projects?: Array<{ id: string; name: string }>
}

// Config for a single Focused Work tab
export interface FocusedTabConfig {
  id: string
  label: string
  projectIds: string[]
  includeTagIds: string[]
  excludeTagIds: string[]
}

// Storage schema for Focused Work tabs
export interface FocusedTabsConfig {
  version: 1
  tabs: FocusedTabConfig[]
}


