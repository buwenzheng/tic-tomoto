// 共享 Schema 定义与默认数据、迁移逻辑（供主进程与渲染进程共用）

import { z } from 'zod'

// 基础类型定义
export interface Task {
  id: string
  title: string
  description?: string
  category?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in-progress' | 'completed'
  estimatedPomodoros: number
  completedPomodoros: number
  isCompleted: boolean
  createdAt: number
  updatedAt: number
  completedAt?: number
  tags?: string[]
}

export interface Schema {
  tasks: Task[]
  timer: {
    mode: string
    timeLeft: number
    totalTime: number
    isRunning: boolean
    isPaused: boolean
    endAt?: number
  }
  settings: {
    workDuration: number
    shortBreakDuration: number
    longBreakDuration: number
    autoStartBreaks: boolean
    autoStartPomodoros: boolean
    longBreakInterval: number
    alarmSound: string
    alarmVolume: number
    tickingSound: string
    tickingVolume: number
    darkMode: string
    minimizeToTray: boolean
  }
  stats: {
    totalPomodoros: number
    totalWorkTime: number
    dailyPomodoros: Record<string, number>
    weeklyPomodoros: Record<string, number>
    monthlyPomodoros: Record<string, number>
  }
  version: number
}

export const DEFAULT_DATA: Schema = {
  tasks: [],
  timer: {
    mode: 'work',
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    isRunning: false,
    isPaused: false,
    endAt: undefined
  },
  settings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    longBreakInterval: 4,
    alarmSound: 'bell',
    alarmVolume: 0.8,
    tickingSound: 'none',
    tickingVolume: 0.5,
    darkMode: 'auto',
    minimizeToTray: true
  },
  stats: {
    totalPomodoros: 0,
    totalWorkTime: 0,
    dailyPomodoros: {},
    weeklyPomodoros: {},
    monthlyPomodoros: {}
  },
  version: 1
}

export function migrateData(data: Partial<Schema>): Schema {
  if (!data || typeof data !== 'object' || data === null) {
    return DEFAULT_DATA
  }

  if (!('version' in data) || !data.version) {
    return migrateFromV0(data)
  }

  switch (data.version) {
    case 1:
      return data as Schema
    default:
      return DEFAULT_DATA
  }
}

function migrateFromV0(oldData: Partial<Schema>): Schema {
  const newData: Schema = { ...DEFAULT_DATA }

  if (Array.isArray(oldData.tasks)) {
    newData.tasks = oldData.tasks.map(
      (task: any) =>
        ({
          id: task.id || Date.now().toString(),
          title: task.title || 'Untitled Task',
          description: task.description || '',
          category: task.category || '',
          priority: task.priority || 'medium',
          status: task.status || 'pending',
          estimatedPomodoros: task.estimatedPomodoros || 1,
          completedPomodoros: task.completedPomodoros || 0,
          isCompleted: task.isCompleted || false,
          createdAt: task.createdAt || Date.now(),
          updatedAt: task.updatedAt || Date.now(),
          completedAt: task.completedAt,
          tags: task.tags || []
        }) as Task
    )
  }

  if (oldData.timer && typeof oldData.timer === 'object') {
    newData.timer = {
      ...newData.timer,
      ...oldData.timer
    }
  }

  if (oldData.settings && typeof oldData.settings === 'object') {
    newData.settings = {
      ...newData.settings,
      ...oldData.settings
    }
  }

  if (oldData.stats && typeof oldData.stats === 'object') {
    newData.stats = {
      ...newData.stats,
      ...oldData.stats
    }
  }

  return newData
}

// ===============================
// Zod 数据校验器
// ===============================

// 任务校验器
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID cannot be empty'),
  title: z.string().min(1, 'Task title cannot be empty').max(200, 'Task title too long'),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Priority must be low, medium, or high' })
  }),
  status: z.enum(['pending', 'in-progress', 'completed'], {
    errorMap: () => ({ message: 'Status must be pending, in-progress, or completed' })
  }),
  estimatedPomodoros: z.number().int().positive('Estimated pomodoros must be positive'),
  completedPomodoros: z.number().int().min(0, 'Completed pomodoros cannot be negative'),
  isCompleted: z.boolean(),
  createdAt: z.number().positive('Created date must be valid'),
  updatedAt: z.number().positive('Updated date must be valid'),
  completedAt: z.number().positive().optional(),
  tags: z.array(z.string()).optional()
})

// 计时器状态校验器
export const TimerSchema = z.object({
  mode: z.string(),
  timeLeft: z.number().min(0, 'Time left cannot be negative'),
  totalTime: z.number().positive('Total time must be positive'),
  isRunning: z.boolean(),
  isPaused: z.boolean(),
  endAt: z.number().positive().optional()
})

// 设置校验器
export const SettingsSchema = z.object({
  workDuration: z.number().positive('Work duration must be positive'),
  shortBreakDuration: z.number().positive('Short break duration must be positive'),
  longBreakDuration: z.number().positive('Long break duration must be positive'),
  autoStartBreaks: z.boolean(),
  autoStartPomodoros: z.boolean(),
  longBreakInterval: z.number().int().positive('Long break interval must be positive'),
  alarmSound: z.string(),
  alarmVolume: z.number().min(0).max(1, 'Volume must be between 0 and 1'),
  tickingSound: z.string(),
  tickingVolume: z.number().min(0).max(1, 'Volume must be between 0 and 1'),
  darkMode: z.string(),
  minimizeToTray: z.boolean()
})

// 统计数据校验器
export const StatsSchema = z.object({
  totalPomodoros: z.number().int().min(0, 'Total pomodoros cannot be negative'),
  totalWorkTime: z.number().min(0, 'Total work time cannot be negative'),
  dailyPomodoros: z.record(z.string(), z.number().int().min(0)),
  weeklyPomodoros: z.record(z.string(), z.number().int().min(0)),
  monthlyPomodoros: z.record(z.string(), z.number().int().min(0))
})

// 完整 Schema 校验器
export const SchemaValidator = z.object({
  tasks: z.array(TaskSchema),
  timer: TimerSchema,
  settings: SettingsSchema,
  stats: StatsSchema,
  version: z.number().int().positive()
})

// 数据校验和迁移函数
export function validateAndMigrateData(data: unknown): Schema {
  try {
    // 首先尝试直接校验
    const validatedData = SchemaValidator.parse(data)
    return validatedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('Data validation failed, attempting migration:', error.issues)

      // 校验失败，尝试迁移
      try {
        const migratedData = migrateData(data as Partial<Schema>)

        // 迁移后再次校验
        const validatedMigratedData = SchemaValidator.parse(migratedData)
        console.log('Data successfully migrated and validated')
        return validatedMigratedData
      } catch (migrationError) {
        console.error('Migration also failed, using default data:', migrationError)
        return DEFAULT_DATA
      }
    } else {
      console.error('Unexpected validation error:', error)
      return DEFAULT_DATA
    }
  }
}

// 任务数据单独校验
export function validateTask(task: unknown): Task | null {
  try {
    return TaskSchema.parse(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Task validation failed:', error.issues)
    }
    return null
  }
}

// 修复任务数据（尽力修复）
export function fixTaskData(task: any): Task {
  const now = Date.now()

  return {
    id: typeof task.id === 'string' && task.id ? task.id : `task_${now}`,
    title:
      typeof task.title === 'string' && task.title ? task.title.slice(0, 200) : 'Untitled Task',
    description: typeof task.description === 'string' ? task.description : undefined,
    category: typeof task.category === 'string' ? task.category : undefined,
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    status: ['pending', 'in-progress', 'completed'].includes(task.status) ? task.status : 'pending',
    estimatedPomodoros:
      typeof task.estimatedPomodoros === 'number' && task.estimatedPomodoros > 0
        ? Math.floor(task.estimatedPomodoros)
        : 1,
    completedPomodoros:
      typeof task.completedPomodoros === 'number' && task.completedPomodoros >= 0
        ? Math.floor(task.completedPomodoros)
        : 0,
    isCompleted: Boolean(task.isCompleted),
    createdAt: typeof task.createdAt === 'number' && task.createdAt > 0 ? task.createdAt : now,
    updatedAt: typeof task.updatedAt === 'number' && task.updatedAt > 0 ? task.updatedAt : now,
    completedAt:
      typeof task.completedAt === 'number' && task.completedAt > 0 ? task.completedAt : undefined,
    tags: Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === 'string') : undefined
  }
}
