import { ElectronAPI } from '@electron-toolkit/preload'

// ===============================
// 番茄钟应用API类型定义
// ===============================

interface TomatoAPI {
  // 文件系统API
  fs: {
    readData: (filename: string) => Promise<string | null>
    saveData: (filename: string, data: string) => Promise<boolean>
    checkFileExists: (filename: string) => Promise<boolean>
    getUserDataPath: () => Promise<string>
  }

  // 数据库API
  db: {
    read: () => Promise<any>
    write: (data: any) => Promise<boolean>
  }

  // 窗口控制API
  window: {
    setAlwaysOnTop: (alwaysOnTop: boolean) => void
    minimize: () => void
    hide: () => void
    show: () => void
    focus: () => void
    setSize: (width: number, height: number) => void
    center: () => void
    isMaximized: () => Promise<boolean>
    maximize: () => void
    unmaximize: () => void
    close: () => void
  }

  // 系统API
  system: {
    showNotification: (
      title: string,
      body: string,
      options?: {
        icon?: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
      }
    ) => void
    registerGlobalShortcut: (accelerator: string, callback: () => void) => void
    unregisterGlobalShortcut: (accelerator: string) => void
    unregisterAllShortcuts: () => void
    playSound: (soundPath: string, volume?: number) => void
  }

  // 计时器API
  timer: {
    startWorker: (intervalMs: number) => void
    stopWorker: () => void
    onTick: (callback: () => void) => void
    offTick: () => void
  }

  // 应用生命周期API
  app: {
    getVersion: () => Promise<string>
    quit: () => void
    restart: () => void
    setLaunchOnStartup: (enable: boolean) => void
    isLaunchOnStartup: () => Promise<boolean>
  }

  // 开发者API
  dev: {
    openDevTools: () => void
    reloadWindow: () => void
    toggleDevTools: () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    tomatoAPI: TomatoAPI
  }
}
