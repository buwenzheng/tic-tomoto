import type { Schema } from '@shared/schema'

declare global {
  interface Window {
    tomatoAPI: {
      fs: {
        readData: (filename: string) => Promise<string | null>
        saveData: (filename: string, data: string) => Promise<boolean>
        checkFileExists: (filename: string) => Promise<boolean>
        getUserDataPath: () => Promise<string>
      }
      db: {
        read: () => Promise<Schema>
        write: (data: Schema) => Promise<boolean>
      }
      window: {
        setAlwaysOnTop: (alwaysOnTop: boolean) => void
        minimize: () => void
        hide: () => void
        show: () => void
        focus: () => void
        setSize: (width: number, height: number) => void
        center: () => void
        maximize: () => void
        unmaximize: () => void
        isMaximized: () => Promise<boolean>
        close: () => void
      }
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
      timer: {
        startWorker: (intervalMs: number) => void
        stopWorker: () => void
        onTick: (callback: () => void) => void
        offTick: () => void
      }
      app: {
        getVersion: () => Promise<string>
        quit: () => void
        restart: () => void
        setLaunchOnStartup: (enable: boolean) => void
        isLaunchOnStartup: () => Promise<boolean>
      }
      dev: {
        openDevTools: () => void
        reloadWindow: () => void
        toggleDevTools: () => void
      }
      platform: string // 添加平台信息
    }
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
  }
}

export {}
