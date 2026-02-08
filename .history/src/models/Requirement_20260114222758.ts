export interface Requirement {
  id: number
  title: string
  description: string
  status: 'Open' | 'In Progress' | 'Done'
  assignee: string
}