import { app, shell, BrowserWindow, ipcMain, globalShortcut, Notification } from 'electron'
import { join } from 'path'
import { readFile, writeFile, existsSync, mkdirSync } from 'fs'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { JSONFilePreset } from 'lowdb/node'

// ===============================
// 文件系统相关
// ===============================

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

// 获取用户数据目录
const getUserDataPath = (): string => {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'tomato-data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  return dataDir
}

// ===============================
// LowDB 数据库服务
// ===============================

// 数据库模式
interface Schema {
  tasks: any[]
  timer: {
    mode: string
    timeLeft: number
    totalTime: number
    isRunning: boolean
    isPaused: boolean
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

// 默认数据
const DEFAULT_DATA: Schema = {
  tasks: [],
  timer: {
    mode: 'work',
    timeLeft: 25 * 60,
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

// 数据库实例
let db: any = null

// 初始化数据库
async function initializeDatabase(): Promise<void> {
  if (db) return

  try {
    const dbPath = join(getUserDataPath(), 'tic-tomoto-data.json')
    db = await JSONFilePreset<Schema>(dbPath, DEFAULT_DATA)
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

// 数据迁移
async function migrateData(data: Partial<Schema>): Promise<Schema> {
  // 如果没有版本号，说明是旧数据，需要迁移
  if (!data.version) {
    return migrateFromV0(data)
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
function migrateFromV0(oldData: Partial<Schema>): Schema {
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

// ===============================
// 计时器Worker实现
// ===============================

class TimerWorker {
  private interval: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null

  constructor(window: BrowserWindow) {
    this.mainWindow = window
  }

  start(intervalMs: number): void {
    this.stop() // 确保停止之前的计时器

    this.interval = setInterval(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('timer:tick')
      }
    }, intervalMs)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  destroy(): void {
    this.stop()
    this.mainWindow = null
  }
}

// ===============================
// 全局变量
// ===============================

let mainWindow: BrowserWindow | null = null
let timerWorker: TimerWorker | null = null

// ===============================
// 窗口创建函数
// ===============================

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 350,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    // 根据平台使用不同的标题栏样式
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset', // macOS下使用hiddenInset
          trafficLightPosition: { x: 20, y: 20 }, // 调整红绿灯按钮位置
        }
      : {
          frame: false, // Windows/Linux下完全自定义框架
        }),
    title: '番茄时钟',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // 初始化计时器Worker
  timerWorker = new TimerWorker(mainWindow)

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
    mainWindow.show()

      // 开发模式下打开开发者工具
      if (is.dev) {
        mainWindow.webContents.openDevTools()
      }
    }
  })

  mainWindow.on('closed', () => {
    if (timerWorker) {
      timerWorker.destroy()
      timerWorker = null
    }
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ===============================
// IPC处理器设置
// ===============================

function setupIpcHandlers(): void {
  // 文件系统API
  ipcMain.handle('fs:readData', async (_, filename: string) => {
    try {
      const dataPath = join(getUserDataPath(), filename)
      if (!existsSync(dataPath)) {
        return null
      }
      const data = await readFileAsync(dataPath, 'utf-8')
      return data
    } catch (error) {
      console.error('Error reading file:', error)
      return null
    }
  })

  ipcMain.handle('fs:saveData', async (_, filename: string, data: string) => {
    try {
      const dataPath = join(getUserDataPath(), filename)
      await writeFileAsync(dataPath, data, 'utf-8')
      return true
    } catch (error) {
      console.error('Error saving file:', error)
      return false
    }
  })

  ipcMain.handle('fs:checkFileExists', async (_, filename: string) => {
    try {
      const dataPath = join(getUserDataPath(), filename)
      return existsSync(dataPath)
    } catch (error) {
      console.error('Error checking file exists:', error)
      return false
    }
  })

  ipcMain.handle('fs:getUserDataPath', async () => {
    try {
      return getUserDataPath()
    } catch (error) {
      console.error('Error getting user data path:', error)
      return ''
    }
  })

  // 数据库API
  ipcMain.handle('db:read', async () => {
    try {
      await initializeDatabase()
      return db.data
    } catch (error) {
      console.error('Error reading database:', error)
      return DEFAULT_DATA
    }
  })

  ipcMain.handle('db:write', async (_, data: Schema) => {
    try {
      await initializeDatabase()
      db.data = await migrateData(data)
      await db.write()
      return true
    } catch (error) {
      console.error('Error writing to database:', error)
      return false
    }
  })

  // 窗口控制API
  ipcMain.on('window:setAlwaysOnTop', (_, alwaysOnTop: boolean) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(alwaysOnTop)
    }
  })

  ipcMain.on('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  ipcMain.on('window:hide', () => {
    if (mainWindow) {
      mainWindow.hide()
    }
  })

  ipcMain.on('window:show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  ipcMain.on('window:focus', () => {
    if (mainWindow) {
      mainWindow.focus()
    }
  })

  ipcMain.on('window:setSize', (_, width: number, height: number) => {
    if (mainWindow) {
      mainWindow.setSize(width, height)
    }
  })

  ipcMain.on('window:center', () => {
    if (mainWindow) {
      mainWindow.center()
    }
  })

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      mainWindow.maximize()
    }
  })

  ipcMain.on('window:unmaximize', () => {
    if (mainWindow) {
      mainWindow.unmaximize()
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    if (mainWindow) {
      return mainWindow.isMaximized()
    }
    return false
  })

  ipcMain.on('window:close', () => {
    if (mainWindow) {
      mainWindow.close()
    }
  })

  // 系统API
  ipcMain.on(
    'system:showNotification',
    (
      _,
      options: {
        title: string
        body: string
        icon?: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
      }
    ) => {
      try {
        const notification = new Notification({
          title: options.title,
          body: options.body,
          icon: options.icon,
          silent: options.silent
        })
        notification.show()
      } catch (error) {
        console.error('Error showing notification:', error)
      }
    }
  )

  ipcMain.on('system:registerGlobalShortcut', (_, accelerator: string, channelId: string) => {
    try {
      globalShortcut.register(accelerator, () => {
        if (mainWindow) {
          mainWindow.webContents.send(channelId)
        }
      })
    } catch (error) {
      console.error('Error registering global shortcut:', error)
    }
  })

  ipcMain.on('system:unregisterGlobalShortcut', (_, accelerator: string) => {
    try {
      globalShortcut.unregister(accelerator)
    } catch (error) {
      console.error('Error unregistering global shortcut:', error)
    }
  })

  ipcMain.on('system:unregisterAllShortcuts', () => {
    try {
      globalShortcut.unregisterAll()
    } catch (error) {
      console.error('Error unregistering all shortcuts:', error)
    }
  })

  ipcMain.on('system:playSound', (_, soundPath: string, volume: number) => {
    // 这里可以使用第三方库播放音频，或者通过渲染进程播放
    if (mainWindow) {
      mainWindow.webContents.send('system:playSoundRequest', soundPath, volume)
    }
  })

  // 计时器API
  ipcMain.on('timer:startWorker', (_, intervalMs: number) => {
    if (timerWorker) {
      timerWorker.start(intervalMs)
    }
  })

  ipcMain.on('timer:stopWorker', () => {
    if (timerWorker) {
      timerWorker.stop()
    }
  })

  // 应用生命周期API
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.on('app:quit', () => {
    app.quit()
  })

  ipcMain.on('app:restart', () => {
    app.relaunch()
    app.exit()
  })

  ipcMain.on('app:setLaunchOnStartup', (_, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: enable
    })
  })

  ipcMain.handle('app:isLaunchOnStartup', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  // 开发者API
  ipcMain.on('dev:openDevTools', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools()
    }
  })

  ipcMain.on('dev:reloadWindow', () => {
    if (mainWindow) {
      mainWindow.webContents.reload()
    }
  })

  ipcMain.on('dev:toggleDevTools', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // 兼容性API
  ipcMain.on('ping', () => console.log('pong'))
}

// ===============================
// 应用初始化
// ===============================

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.tomato.pomodoro')

  // 设置IPC处理器
  setupIpcHandlers()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // 清理全局快捷键
  globalShortcut.unregisterAll()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用即将退出时清理资源
app.on('before-quit', () => {
  if (timerWorker) {
    timerWorker.destroy()
  }
  globalShortcut.unregisterAll()
})

// Security: 限制新窗口创建
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url)

    if (parsedUrl.origin !== 'https://electron-vite.org') {
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })
})

// 在生产环境中禁用导航到外部网站
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (parsedUrl.origin !== contents.getURL()) {
      event.preventDefault()
    }
  })
})
