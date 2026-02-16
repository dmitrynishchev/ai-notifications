export interface Task {
  id: string
  title: string
  description: string
  status: 'idle' | 'selected' | 'queued' | 'running' | 'done'
}
