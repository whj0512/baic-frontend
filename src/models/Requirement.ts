export interface Requirement {
  id: number
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Done'
  assignee: string
}
