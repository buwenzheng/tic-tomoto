// 任务领域类型

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Task {
  id: string
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  completedPomodoros: number
  isCompleted: boolean
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  tags?: string[]
}

export interface TaskFormData {
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  tags?: string[]
}
