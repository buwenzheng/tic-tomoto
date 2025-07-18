import { contextBridge, ipcRenderer } from 'electron'
// 修改导入方式，避免 ESM 导入问题
import { electronAPI } from '@electron-toolkit/preload'

// ===============================
// 番茄钟应用API定义
// ===============================

const tomatoAPI = {
  // 文件系统API - 数据持久化
  fs: {
    readData: async (filename: string): Promise<string | null> => {
      try {
        return await ipcRenderer.invoke('fs:readData', filename)
      } catch (error) {
        console.error('Failed to read data:', error)
        return null
      }
    },

    saveData: async (filename: string, data: string): Promise<boolean> => {
      try {
        return await ipcRenderer.invoke('fs:saveData', filename, data)
      } catch (error) {
        console.error('Failed to save data:', error)
        return false
      }
    },

    checkFileExists: async (filename: string): Promise<boolean> => {
      try {
        return await ipcRenderer.invoke('fs:checkFileExists', filename)
      } catch (error) {
        console.error('Failed to check file exists:', error)
        return false
      }
    },

    getUserDataPath: async (): Promise<string> => {
      try {
        return await ipcRenderer.invoke('fs:getUserDataPath')
      } catch (error) {
        console.error('Failed to get user data path:', error)
        return ''
      }
    }
  },

  // 数据库API - 安全的数据库访问
  db: {
    read: async (): Promise<any> => {
      try {
        return await ipcRenderer.invoke('db:read')
      } catch (error) {
        console.error('Failed to read database:', error)
        throw error
      }
    },

    write: async (data: any): Promise<boolean> => {
      try {
        return await ipcRenderer.invoke('db:write', data)
      } catch (error) {
        console.error('Failed to write to database:', error)
        throw error
      }
    }
  },

  // 窗口控制API - 严格模式支持
  window: {
    setAlwaysOnTop: (alwaysOnTop: boolean): void => {
      ipcRenderer.send('window:setAlwaysOnTop', alwaysOnTop)
    },

    minimize: (): void => {
      ipcRenderer.send('window:minimize')
    },

    hide: (): void => {
      ipcRenderer.send('window:hide')
    },

    show: (): void => {
      ipcRenderer.send('window:show')
    },

    focus: (): void => {
      ipcRenderer.send('window:focus')
    },

    setSize: (width: number, height: number): void => {
      ipcRenderer.send('window:setSize', width, height)
    },

    center: (): void => {
      ipcRenderer.send('window:center')
    },

    maximize: (): void => {
      ipcRenderer.send('window:maximize')
    },

    unmaximize: (): void => {
      ipcRenderer.send('window:unmaximize')
    },

    isMaximized: async (): Promise<boolean> => {
      return await ipcRenderer.invoke('window:isMaximized')
    },

    close: (): void => {
      ipcRenderer.send('window:close')
    }
  },

  // 系统API - 通知和快捷键
  system: {
    showNotification: (
      title: string,
      body: string,
      options?: {
        icon?: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
      }
    ): void => {
      ipcRenderer.send('system:showNotification', { title, body, ...options })
    },

    registerGlobalShortcut: (accelerator: string, callback: () => void): void => {
      const channelId = `shortcut:${accelerator}`
      ipcRenderer.removeAllListeners(channelId)
      ipcRenderer.on(channelId, callback)
      ipcRenderer.send('system:registerGlobalShortcut', accelerator, channelId)
    },

    unregisterGlobalShortcut: (accelerator: string): void => {
      ipcRenderer.send('system:unregisterGlobalShortcut', accelerator)
    },

    unregisterAllShortcuts: (): void => {
      ipcRenderer.send('system:unregisterAllShortcuts')
    },

    playSound: (soundPath: string, volume: number = 1.0): void => {
      ipcRenderer.send('system:playSound', soundPath, volume)
    }
  },

  // 计时器API - 精确计时
  timer: {
    startWorker: (intervalMs: number): void => {
      ipcRenderer.send('timer:startWorker', intervalMs)
    },

    stopWorker: (): void => {
      ipcRenderer.send('timer:stopWorker')
    },

    onTick: (callback: () => void): void => {
      ipcRenderer.removeAllListeners('timer:tick')
      ipcRenderer.on('timer:tick', callback)
    },

    offTick: (): void => {
      ipcRenderer.removeAllListeners('timer:tick')
    }
  },

  // 应用生命周期API
  app: {
    getVersion: async (): Promise<string> => {
      return await ipcRenderer.invoke('app:getVersion')
    },

    quit: (): void => {
      ipcRenderer.send('app:quit')
    },

    restart: (): void => {
      ipcRenderer.send('app:restart')
    },

    setLaunchOnStartup: (enable: boolean): void => {
      ipcRenderer.send('app:setLaunchOnStartup', enable)
    },

    isLaunchOnStartup: async (): Promise<boolean> => {
      return await ipcRenderer.invoke('app:isLaunchOnStartup')
    }
  },

  // 开发者API
  dev: {
    openDevTools: (): void => {
      ipcRenderer.send('dev:openDevTools')
    },

    reloadWindow: (): void => {
      ipcRenderer.send('dev:reloadWindow')
    },

    toggleDevTools: (): void => {
      ipcRenderer.send('dev:toggleDevTools')
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('tomatoAPI', tomatoAPI)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.tomatoAPI = tomatoAPI
}
