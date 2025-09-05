import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Notification,
  Tray,
  Menu,
  session
} from 'electron'
import { join } from 'path'
import { readFile, writeFile, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { JSONFilePreset, LowDB } from 'lowdb/node'
import { Schema, DEFAULT_DATA, migrateData } from '@shared/schema'
import { z } from 'zod'

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

// 数据库实例
let db: LowDB<Schema> | null = null

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

// 数据迁移由 @shared/schema 统一提供

// ===============================
// 简易日志记录（写入 userData/logs/app.log）
// ===============================

let logFilePath: string | null = null

function initializeLogger(): void {
  try {
    const logsDir = join(getUserDataPath(), 'logs')
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })
    logFilePath = join(logsDir, 'app.log')
  } catch (err) {
    console.warn('Failed to initialize logger:', err)
  }
}

async function writeLog(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
  try {
    if (!logFilePath) initializeLogger()
    const ts = new Date().toISOString()
    const line = `[${ts}] [${level.toUpperCase()}] ${message}\n`
    await writeFileAsync(logFilePath as string, line, { flag: 'a', encoding: 'utf-8' })
  } catch (err) {
    // ignore logging failure
  }
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
let tray: Tray | null = null
let isQuitting = false

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
          trafficLightPosition: { x: 8, y: 12 } // 调整红绿灯按钮位置
        }
      : {
          frame: false // Windows/Linux下完全自定义框架
        }),
    title: '番茄时钟',
    ...(process.platform === 'darwin'
      ? { vibrancy: 'under-window', visualEffectState: 'active' }
      : {}),
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

  // 根据设置最小化到托盘
  mainWindow.on('close', (e) => {
    try {
      const minimizeToTray = db?.data?.settings?.minimizeToTray ?? true
      if (!isQuitting && minimizeToTray) {
        e.preventDefault()
        mainWindow?.hide()
        writeLog('info', 'Window hidden to tray').catch(() => {})
      }
    } catch (err) {
      if (!isQuitting) {
        e.preventDefault()
        mainWindow?.hide()
        writeLog('warn', 'Window hidden to tray (fallback)').catch(() => {})
      }
    }
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
  // ===== 验证器 =====
  const filenameSchema = z
    .string()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9_.-]+$/)
  const acceleratorSchema = z.string().min(1)

  // 文件系统API
  ipcMain.handle('fs:readData', async (_, filename: string) => {
    try {
      const parsed = filenameSchema.safeParse(filename)
      if (!parsed.success) return null
      const dataPath = join(getUserDataPath(), parsed.data)
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
      const parsed = filenameSchema.safeParse(filename)
      if (!parsed.success || typeof data !== 'string') return false
      const dataPath = join(getUserDataPath(), parsed.data)
      await writeFileAsync(dataPath, data, 'utf-8')
      return true
    } catch (error) {
      console.error('Error saving file:', error)
      return false
    }
  })

  ipcMain.handle('fs:checkFileExists', async (_, filename: string) => {
    try {
      const parsed = filenameSchema.safeParse(filename)
      if (!parsed.success) return false
      const dataPath = join(getUserDataPath(), parsed.data)
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

  // 备份/恢复 API
  const getBackupDir = () => {
    const dir = join(getUserDataPath(), 'backups')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }

  const backupFilenameSchema = z.string().regex(/^backup-\d{8}-\d{6}\.json$/)

  ipcMain.handle('backup:list', async () => {
    try {
      const dir = getBackupDir()
      const files = readdirSync(dir)
        .filter((f) => backupFilenameSchema.safeParse(f).success)
        .sort()
        .reverse()
      return files
    } catch (err) {
      console.error('Error listing backups:', err)
      return []
    }
  })

  ipcMain.handle('backup:create', async () => {
    try {
      await initializeDatabase()
      const dir = getBackupDir()
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const filename = `backup-${ts}.json`
      const filepath = join(dir, filename)
      await writeFileAsync(filepath, JSON.stringify(db.data, null, 2), 'utf-8')
      // 保留最近 10 份
      const files = readdirSync(dir)
        .filter((f) => backupFilenameSchema.safeParse(f).success)
        .sort()
        .reverse()
      if (files.length > 10) {
        const toRemove = files.slice(10)
        toRemove.forEach((f) => {
          try {
            unlinkSync(join(dir, f))
          } catch (err) {
            writeLog('debug', `Failed to cleanup old backup: ${err}`)
          }
        })
      }
      return { success: true, filename }
    } catch (err) {
      console.error('Error creating backup:', err)
      return { success: false }
    }
  })

  ipcMain.handle('backup:restore', async (_, filename: string) => {
    try {
      const parsed = backupFilenameSchema.safeParse(filename)
      if (!parsed.success) return { success: false }
      const filepath = join(getBackupDir(), parsed.data)
      const content = await readFileAsync(filepath, 'utf-8')
      const data = JSON.parse(content)
      await initializeDatabase()
      db.data = migrateData(data)
      await db.write()
      // 通知渲染进程可自行刷新
      if (mainWindow) mainWindow.webContents.send('backup:restored')
      return { success: true }
    } catch (err) {
      console.error('Error restoring backup:', err)
      return { success: false }
    }
  })

  ipcMain.handle('backup:openFolder', async () => {
    try {
      const dir = getBackupDir()
      await shell.openPath(dir)
      return true
    } catch (err) {
      console.error('Error opening backup folder:', err)
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

  ipcMain.on('system:registerGlobalShortcut', (_, accelerator: string) => {
    try {
      const parsed = acceleratorSchema.safeParse(accelerator)
      if (!parsed.success) return
      const channel = 'app:globalShortcut:toggleTimer'
      globalShortcut.register(parsed.data, () => {
        if (mainWindow) {
          mainWindow.webContents.send(channel)
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
    isQuitting = true
    app.quit()
  })

  ipcMain.on('app:restart', () => {
    isQuitting = true
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

  // 更新相关 API
  ipcMain.on('update:check', async () => {
    try {
      writeLog('info', 'Checking for updates').catch(() => {})
      await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('Update check failed:', err)
    }
  })

  ipcMain.on('update:quitAndInstall', () => {
    isQuitting = true
    autoUpdater.quitAndInstall()
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

  // 初始化数据库，供后续事件读取设置
  initializeDatabase().catch(() => {})

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Dev 环境为 HMR 放宽 CSP
  if (is.dev) {
    try {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const csp =
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws:; frame-src 'none'; object-src 'none'"
        const headers = details.responseHeaders || {}
        headers['Content-Security-Policy'] = [csp]
        callback({ responseHeaders: headers })
      })
    } catch (e) {
      console.warn('Failed to set dev CSP headers:', e)
    }
  }

  // 托盘
  try {
    tray = new Tray(process.platform === 'linux' ? icon : undefined)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示/隐藏',
        click: () => {
          if (!mainWindow) return
          if (mainWindow.isVisible()) mainWindow.hide()
          else mainWindow.show()
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
    tray.setToolTip('番茄时钟')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      if (!mainWindow) return
      if (mainWindow.isVisible()) mainWindow.hide()
      else mainWindow.show()
    })
  } catch (err) {
    console.warn('Tray init failed:', err)
  }

  // 自动更新事件
  autoUpdater.on('update-available', () => {
    writeLog('info', 'Update available').catch(() => {})
    mainWindow?.webContents.send('update:available')
  })
  autoUpdater.on('update-not-available', () => {
    writeLog('info', 'Update not available').catch(() => {})
    mainWindow?.webContents.send('update:not-available')
  })
  autoUpdater.on('error', (err) => {
    writeLog('error', `Update error: ${err?.message || String(err)}`).catch(() => {})
    mainWindow?.webContents.send('update:error', err?.message || String(err))
  })
  autoUpdater.on('download-progress', (info) => {
    mainWindow?.webContents.send('update:download-progress', info)
  })
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:downloaded')
  })

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

  if (process.platform !== 'darwin' && !isQuitting) {
    // 非 macOS 默认保持托盘常驻，不直接退出
    return
  }
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

// Security: 统一管理外链与导航策略
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)
      // 仅允许受信任源，其他以外部方式打开
      const allowlist = new Set<string>(['https://electron-vite.org'])
      if (!allowlist.has(parsedUrl.origin)) {
        shell.openExternal(url)
        return { action: 'deny' }
      }
      return { action: 'allow' }
    } catch (err) {
      writeLog('debug', `Navigation check failed: ${err}`)
      return { action: 'deny' }
    }
  })

  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const target = new URL(navigationUrl)
      const current = new URL(contents.getURL())
      if (target.origin !== current.origin) {
        event.preventDefault()
        shell.openExternal(navigationUrl)
      }
    } catch (err) {
      writeLog('debug', `External link failed: ${err}`)
      event.preventDefault()
    }
  })
})
