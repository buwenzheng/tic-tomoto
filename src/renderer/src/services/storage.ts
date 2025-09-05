import { Schema, DEFAULT_DATA, migrateData } from '@shared/schema'

// 透出共享 DEFAULT_DATA，保持对外 API 不变
export { DEFAULT_DATA } from '@shared/schema'

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
      return migrateData(JSON.parse(data))
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

  // 迁移逻辑由共享模块提供
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
