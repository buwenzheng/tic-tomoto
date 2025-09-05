// 共享 Schema 定义与默认数据、迁移逻辑（供主进程与渲染进程共用）

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
