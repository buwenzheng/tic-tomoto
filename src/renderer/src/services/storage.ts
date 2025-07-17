import type {
  Task,
  TaskRepository,
  StatsRepository,
  SettingsRepository,
  StorageAdapter,
  AppSettings,
  TaskStatus,
  ThemeMode,
  FontSize
} from '@/types'

// 默认配置
const defaultSettings: AppSettings = {
  timer: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartWork: false,
    tickSound: false,
    notificationSound: true,
    strictMode: false
  },
  general: {
    language: 'zh-CN',
    startMinimized: false,
    minimizeToTray: true,
    launchOnStartup: false,
    enableShortcuts: true
  },
  appearance: {
    theme: 'auto' as ThemeMode,
    primaryColor: '#ef4444',
    fontSize: 'medium' as FontSize,
    compactMode: false,
    showTaskProgress: true,
    showSessionCounter: true
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    taskCompleted: true,
    sessionCompleted: true,
    breakReminder: true,
    soundVolume: 0.7
  },
  advanced: {
    dataBackup: true,
    analyticsEnabled: false,
    experimentalFeatures: false,
    developerMode: false
  }
}

// Repository实现类
class LocalTaskRepository implements TaskRepository {
  constructor(
    private db: { data: { tasks: Task[] }; read: () => Promise<void>; write: () => Promise<void> }
  ) {}

  async getAll(): Promise<Task[]> {
    await this.db.read()
    return this.db.data.tasks
  }

  async getById(id: string): Promise<Task | null> {
    await this.db.read()
    return this.db.data.tasks.find((task: Task) => task.id === id) || null
  }

  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date()
    const task: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      createdAt: now,
      updatedAt: now
    }

    await this.db.read()
    this.db.data.tasks.push(task)
    await this.db.write()

    return task
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    await this.db.read()
    const taskIndex = this.db.data.tasks.findIndex((task: Task) => task.id === id)

    if (taskIndex === -1) {
      throw new Error(`Task with id ${id} not found`)
    }

    const updatedTask = {
      ...this.db.data.tasks[taskIndex],
      ...updates,
      updatedAt: new Date()
    }

    this.db.data.tasks[taskIndex] = updatedTask
    await this.db.write()

    return updatedTask
  }

  async delete(id: string): Promise<void> {
    await this.db.read()
    const taskIndex = this.db.data.tasks.findIndex((task: Task) => task.id === id)

    if (taskIndex === -1) {
      throw new Error(`Task with id ${id} not found`)
    }

    this.db.data.tasks.splice(taskIndex, 1)
    await this.db.write()
  }

  async getByCategory(category: string): Promise<Task[]> {
    await this.db.read()
    return this.db.data.tasks.filter((task: Task) => task.category === category)
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    await this.db.read()
    return this.db.data.tasks.filter((task: Task) => {
      switch (status) {
        case 'completed':
          return task.isCompleted
        case 'in-progress':
          return !task.isCompleted && task.completedPomodoros > 0
        case 'pending':
          return !task.isCompleted && task.completedPomodoros === 0
        default:
          return false
      }
    })
  }
}

// 简化的Stats和Settings Repository
class MockStatsRepository implements StatsRepository {
  async getDailyStats(): Promise<null> {
    return null
  }

  async getWeeklyStats(): Promise<null> {
    return null
  }

  async getMonthlyStats(): Promise<null> {
    return null
  }

  async getOverviewStats(): Promise<{
    totalPomodoros: number
    totalTasks: number
    totalFocusTime: number
    currentStreak: number
    longestStreak: number
    averageSessionLength: number
    mostProductiveHour: number
    favoriteCategory: string
  }> {
    return {
      totalPomodoros: 0,
      totalTasks: 0,
      totalFocusTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionLength: 0,
      mostProductiveHour: 9,
      favoriteCategory: ''
    }
  }

  async addPomodoroSession(): Promise<void> {
    // Mock implementation
    return Promise.resolve()
  }

  async updateDailyStats(): Promise<void> {
    // Mock implementation
    return Promise.resolve()
  }
}

class MockSettingsRepository implements SettingsRepository {
  async get(): Promise<AppSettings> {
    return defaultSettings
  }

  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    return { ...defaultSettings, ...updates }
  }

  async reset(): Promise<AppSettings> {
    return defaultSettings
  }
}

// LocalStorageAdapter实现
export class LocalStorageAdapter implements StorageAdapter {
  public tasks: TaskRepository
  public stats: StatsRepository
  public settings: SettingsRepository

  constructor(
    private db: { data: { tasks: Task[] }; read: () => Promise<void>; write: () => Promise<void> }
  ) {
    this.tasks = new LocalTaskRepository(db)
    this.stats = new MockStatsRepository()
    this.settings = new MockSettingsRepository()
  }

  static async create(): Promise<LocalStorageAdapter> {
    // 简化版本，使用内存存储
    const memoryDb = {
      data: {
        tasks: []
      },
      read: async () => {},
      write: async () => {}
    }
    return new LocalStorageAdapter(memoryDb)
  }
}

// 存储服务工厂
export class StorageFactory {
  private static instance: StorageAdapter | null = null

  static async createAdapter(): Promise<StorageAdapter> {
    if (this.instance) {
      return this.instance
    }

    this.instance = await LocalStorageAdapter.create()
    return this.instance
  }

  static getAdapter(): StorageAdapter {
    if (!this.instance) {
      throw new Error('Storage adapter not initialized. Call createAdapter() first.')
    }
    return this.instance
  }
}
