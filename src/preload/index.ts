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
  db: {
    read: () => ipcRenderer.invoke('db:read'),
    write: (data: any) => ipcRenderer.invoke('db:write', data)
  },
  window: {
    setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.send('window:setAlwaysOnTop', alwaysOnTop),
    minimize: () => ipcRenderer.send('window:minimize'),
    hide: () => ipcRenderer.send('window:hide'),
    show: () => ipcRenderer.send('window:show'),
    focus: () => ipcRenderer.send('window:focus'),
    setSize: (width: number, height: number) =>
      ipcRenderer.send('window:setSize', width, height),
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
    registerGlobalShortcut: (accelerator: string, channelId: string) =>
      ipcRenderer.send('system:registerGlobalShortcut', accelerator, channelId),
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
  // 添加平台信息
  platform: process.platform
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.tomatoAPI = tomatoAPI
}
