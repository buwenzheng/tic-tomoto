import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 自定义API
const tomatoAPI = {
  fs: {
    readData: (filename: string) => ipcRenderer.invoke('fs:readData', filename),
    saveData: (filename: string, data: string) => ipcRenderer.invoke('fs:saveData', filename, data),
    checkFileExists: (filename: string) => ipcRenderer.invoke('fs:checkFileExists', filename),
    getUserDataPath: () => ipcRenderer.invoke('fs:getUserDataPath')
  },
  log: {
    debug: (message: string, component?: string, meta?: Record<string, unknown>) =>
      ipcRenderer.invoke('log:debug', message, component, meta),
    info: (message: string, component?: string, meta?: Record<string, unknown>) =>
      ipcRenderer.invoke('log:info', message, component, meta),
    warn: (message: string, component?: string, meta?: Record<string, unknown>) =>
      ipcRenderer.invoke('log:warn', message, component, meta),
    error: (message: string, component?: string, meta?: Record<string, unknown>) =>
      ipcRenderer.invoke('log:error', message, component, meta),
    setLevel: (level: 'debug' | 'info' | 'warn' | 'error') =>
      ipcRenderer.send('log:setLevel', level)
  },
  db: {
    read: () => ipcRenderer.invoke('db:read'),
    write: (data: unknown) => ipcRenderer.invoke('db:write', data)
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list'),
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (filename: string) => ipcRenderer.invoke('backup:restore', filename),
    onRestored: (cb: () => void) => ipcRenderer.on('backup:restored', cb),
    openFolder: () => ipcRenderer.invoke('backup:openFolder')
  },
  window: {
    setAlwaysOnTop: (alwaysOnTop: boolean) =>
      ipcRenderer.send('window:setAlwaysOnTop', alwaysOnTop),
    minimize: () => ipcRenderer.send('window:minimize'),
    hide: () => ipcRenderer.send('window:hide'),
    show: () => ipcRenderer.send('window:show'),
    focus: () => ipcRenderer.send('window:focus'),
    setSize: (width: number, height: number) => ipcRenderer.send('window:setSize', width, height),
    center: () => ipcRenderer.send('window:center'),
    maximize: () => ipcRenderer.send('window:maximize'),
    unmaximize: () => ipcRenderer.send('window:unmaximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.send('window:close')
  },
  system: {
    showNotification: (
      title: string,
      body: string,
      options?: { icon?: string; silent?: boolean; urgency?: 'normal' | 'critical' | 'low' }
    ) => ipcRenderer.send('system:showNotification', { title, body, ...options }),
    registerGlobalShortcut: (accelerator: string) =>
      ipcRenderer.send('system:registerGlobalShortcut', accelerator),
    unregisterGlobalShortcut: (accelerator: string) =>
      ipcRenderer.send('system:unregisterGlobalShortcut', accelerator),
    unregisterAllShortcuts: () => ipcRenderer.send('system:unregisterAllShortcuts'),
    playSound: (soundPath: string, volume?: number) =>
      ipcRenderer.send('system:playSound', soundPath, volume)
  },
  timer: {
    startWorker: (intervalMs: number) => ipcRenderer.send('timer:startWorker', intervalMs),
    stopWorker: () => ipcRenderer.send('timer:stopWorker'),
    onTick: (callback: () => void) => ipcRenderer.on('timer:tick', callback),
    offTick: () => ipcRenderer.removeAllListeners('timer:tick')
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.send('app:quit'),
    restart: () => ipcRenderer.send('app:restart'),
    setLaunchOnStartup: (enable: boolean) => ipcRenderer.send('app:setLaunchOnStartup', enable),
    isLaunchOnStartup: () => ipcRenderer.invoke('app:isLaunchOnStartup')
  },
  dev: {
    openDevTools: () => ipcRenderer.send('dev:openDevTools'),
    reloadWindow: () => ipcRenderer.send('dev:reloadWindow'),
    toggleDevTools: () => ipcRenderer.send('dev:toggleDevTools')
  },
  update: {
    check: () => ipcRenderer.send('update:check'),
    quitAndInstall: () => ipcRenderer.send('update:quitAndInstall'),
    onAvailable: (cb: () => void) => ipcRenderer.on('update:available', cb),
    onNotAvailable: (cb: () => void) => ipcRenderer.on('update:not-available', cb),
    onError: (cb: (_: unknown, message: string) => void) => ipcRenderer.on('update:error', cb),
    onProgress: (cb: (_: unknown, info: unknown) => void) =>
      ipcRenderer.on('update:download-progress', cb),
    onDownloaded: (cb: () => void) => ipcRenderer.on('update:downloaded', cb)
  },
  // 添加平台信息
  platform: process.platform,
  versions: {
    ...process.versions,
    get app() {
      return ipcRenderer.invoke('app:getVersion')
    }
  }
}

// 使用contextBridge暴露API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('tomatoAPI', tomatoAPI)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.tomatoAPI = tomatoAPI
}

// Bridge: 将主进程的全局快捷键事件转发为渲染端自定义事件，保持现有用法
ipcRenderer.on('app:globalShortcut:toggleTimer', () => {
  try {
    document.dispatchEvent(new CustomEvent('toggle-timer'))
  } catch (err) {
    console.error('Failed to dispatch toggle-timer event:', err)
  }
})
