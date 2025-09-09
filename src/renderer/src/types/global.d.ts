import type { Schema } from '@shared/schema'

interface UpdateProgressInfo {
  total: number
  delta: number
  transferred: number
  percent: number
  bytesPerSecond: number
}

interface TomatoAPI {
  // 文件系统API
  fs: {
    readData: (filename: string) => Promise<string | null>
    saveData: (filename: string, data: string) => Promise<boolean>
    checkFileExists: (filename: string) => Promise<boolean>
    getUserDataPath: () => Promise<string>
  }

  // 日志API
  log?: {
    debug: (message: string, component?: string, meta?: Record<string, unknown>) => Promise<void>
    info: (message: string, component?: string, meta?: Record<string, unknown>) => Promise<void>
    warn: (message: string, component?: string, meta?: Record<string, unknown>) => Promise<void>
    error: (message: string, component?: string, meta?: Record<string, unknown>) => Promise<void>
    setLevel: (level: 'debug' | 'info' | 'warn' | 'error') => void
  }

  // 数据库API
  db?: {
    read: () => Promise<Schema>
    write: (data: Schema) => Promise<boolean>
  }

  backup?: {
    list: () => Promise<string[]>
    create: () => Promise<{ success: boolean; filename?: string }>
    restore: (filename: string) => Promise<{ success: boolean }>
    onRestored: (cb: () => void) => void
    openFolder: () => Promise<boolean>
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
    registerGlobalShortcut: (accelerator: string) => void
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

  update?: {
    check: () => void
    quitAndInstall: () => void
    onAvailable: (cb: () => void) => void
    onNotAvailable: (cb: () => void) => void
    onError: (cb: (_: unknown, message: string) => void) => void
    onProgress: (cb: (_: unknown, info: UpdateProgressInfo) => void) => void
    onDownloaded: (cb: () => void) => void
  }

  // 平台信息
  platform: string
  versions: Omit<NodeJS.ProcessVersions, 'app'> & {
    app: Promise<string>
  }
}

interface Window {
  tomatoAPI: TomatoAPI
  electron: {
    ipcRenderer: {
      send: (channel: string, ...args: unknown[]) => void
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      once: (channel: string, listener: (...args: unknown[]) => void) => void
      removeListener: (channel: string, listener: (...args: unknown[]) => void) => void
      removeAllListeners: (channel: string) => void
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
  // 全局状态标记
  isTaskStoreInitialized?: boolean
  isTimerInitialized?: boolean
}
