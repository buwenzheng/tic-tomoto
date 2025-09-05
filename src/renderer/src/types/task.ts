// 任务领域类型

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in-progress' | 'completed'

export interface Task {
  id: string
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  completedPomodoros: number
  isCompleted: boolean
  createdAt: number
  updatedAt: number
  completedAt?: number
  tags?: string[]
  status: TaskStatus
}

export interface TaskFormData {
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  tags?: string[]
}
