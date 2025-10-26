// Type definitions for Asana data we consume

export type AsanaGid = string

export interface AsanaUser {
  gid: AsanaGid
  name: string | null
}

export interface AsanaTask {
  gid: AsanaGid
  name: string
  created_at: string
  permalink_url: string
  assignee: AsanaUser | null
  completed?: boolean
  // Optional memberships to access board columns (sections)
  memberships?: Array<{
    section?: { gid: AsanaGid; name: string | null } | null
    project?: { gid: AsanaGid; name: string }
  }>
  // Optional tags used for filtering and classification
  tags?: Array<{ gid: AsanaGid; name: string }>
}

export interface AsanaWorkspace {
  gid: AsanaGid
  name: string
}

export interface AsanaPaginatedResponse<T> {
  data: T[]
  next_page?: {
    offset: string
    path: string
    uri: string
  } | null
}


