import { Schema, TimerMode, ThemeMode } from '../types'

// 默认数据
export const DEFAULT_DATA: Schema = {
  tasks: [],
  timer: {
    mode: TimerMode.WORK,
    timeLeft: 25 * 60, // 25分钟
    totalTime: 25 * 60,
    isRunning: false,
    isPaused: false
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
    darkMode: ThemeMode.AUTO,
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

// 本地存储适配器接口
export interface StorageAdapter {
  read(): Promise<Schema>
  write(data: Schema): Promise<void>
}

// 本地存储适配器 (localStorage)
export class LocalStorageAdapter implements StorageAdapter {
  private readonly key: string

  constructor(key = 'tic-tomoto-data') {
    this.key = key
  }

  async read(): Promise<Schema> {
    try {
      const data = localStorage.getItem(this.key)
      if (!data) {
        return DEFAULT_DATA
      }
      return this.migrate(JSON.parse(data))
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return DEFAULT_DATA
    }
  }

  async write(data: Schema): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
    } catch (error) {
      console.error('Error writing to localStorage:', error)
      throw error
    }
  }

  // 数据迁移机制
  private async migrate(data: Partial<Schema>): Promise<Schema> {
    // 如果没有版本号，说明是旧数据，需要迁移
    if (!data.version) {
      return this.migrateFromV0(data)
    }

    // 未来可以添加更多版本的迁移
    switch (data.version) {
      case 1:
        return data as Schema
      default:
        console.warn(`Unknown schema version: ${data.version}`)
        return DEFAULT_DATA
    }
  }

  // 从版本0迁移到版本1
  private migrateFromV0(oldData: Partial<Schema>): Schema {
    const newData = { ...DEFAULT_DATA }

    // 迁移任务数据
    if (Array.isArray(oldData.tasks)) {
      newData.tasks = oldData.tasks.map(task => ({
        ...task,
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || new Date()
      }))
    }

    // 迁移计时器数据
    if (oldData.timer) {
      newData.timer = {
        ...newData.timer,
        ...oldData.timer
      }
    }

    // 迁移设置数据
    if (oldData.settings) {
      newData.settings = {
        ...newData.settings,
        ...oldData.settings
      }
    }

    // 迁移统计数据
    if (oldData.stats) {
      newData.stats = {
        ...newData.stats,
        ...oldData.stats
      }
    }

    return newData
  }
}

// Electron 数据库适配器 (通过 IPC 访问主进程的 lowdb)
export class ElectronDbAdapter implements StorageAdapter {
  async read(): Promise<Schema> {
    try {
      if (!window.tomatoAPI?.db) {
        console.warn('Database API not available, falling back to localStorage')
        return new LocalStorageAdapter().read()
      }
      
      const data = await window.tomatoAPI.db.read()
      return data as Schema
    } catch (error) {
      console.error('Error reading from database:', error)
      return DEFAULT_DATA
    }
  }

  async write(data: Schema): Promise<void> {
    try {
      if (!window.tomatoAPI?.db) {
        console.warn('Database API not available, falling back to localStorage')
        return new LocalStorageAdapter().write(data)
      }
      
      await window.tomatoAPI.db.write(data)
    } catch (error) {
      console.error('Error writing to database:', error)
      throw error
    }
  }
}

// 存储工厂 - 根据运行环境选择适当的存储适配器
export class StorageFactory {
  static createAdapter(): StorageAdapter {
    // 检查是否在 Electron 环境中运行并且有数据库 API
    const isElectron = !!window.tomatoAPI?.db
    
    if (isElectron) {
      // 在 Electron 环境中使用数据库 API
      return new ElectronDbAdapter()
    } else {
      // 在浏览器环境中使用 localStorage
      return new LocalStorageAdapter()
    }
  }
}

// 创建存储实例
export const storage = StorageFactory.createAdapter()
