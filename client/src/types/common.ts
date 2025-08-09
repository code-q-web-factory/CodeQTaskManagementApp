// Normalized domain types used by presentational components

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
}


