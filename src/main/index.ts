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
import {
  readFile,
  writeFile,
  rename,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  promises as fsPromises,
  statSync
} from 'fs'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import icon from '../../resources/icon.png?asset'
import { JSONFilePreset } from 'lowdb/node'
import { Schema, DEFAULT_DATA, validateAndMigrateData } from '@shared/schema'
import { z } from 'zod'

// ===============================
// 文件系统相关
// ===============================

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const renameAsync = promisify(rename)

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

// 数据库管理器类，提供事务性操作
class DatabaseManager {
  private db: Awaited<ReturnType<typeof JSONFilePreset<Schema>>> | null = null
  private writeLock = false
  private writeQueue: Array<() => Promise<void>> = []

  async initialize(): Promise<void> {
    if (this.db) return

    try {
      const dbPath = join(getUserDataPath(), 'tic-tomoto-data.json')
      this.db = await JSONFilePreset<Schema>(dbPath, DEFAULT_DATA)
      logger.info('Database initialized successfully', 'database')
    } catch (error) {
      logger.error('Failed to initialize database', 'database', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async safeRead(): Promise<Schema> {
    await this.initialize()
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db.data
  }

  async safeWrite(operation: (data: Schema) => Schema | Promise<Schema>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.writeQueue.push(async () => {
        try {
          this.writeLock = true
          await this.initialize()

          if (!this.db) {
            throw new Error('Database not initialized')
          }

          const result = await operation(this.db.data)
          this.db.data = result
          await this.db.write()

          resolve(true)
        } catch (error) {
          logger.error('Database write error', 'database', {
            error: error instanceof Error ? error.message : String(error)
          })
          reject(error)
        } finally {
          this.writeLock = false
          this.processQueue()
        }
      })

      if (!this.writeLock) {
        this.processQueue()
      }
    })
  }

  private processQueue() {
    if (this.writeQueue.length > 0 && !this.writeLock) {
      const next = this.writeQueue.shift()!
      next()
    }
  }

  getData(): Schema {
    return this.db?.data || DEFAULT_DATA
  }
}

// 数据库管理器实例
const dbManager = new DatabaseManager()

// 兼容性函数
async function initializeDatabase(): Promise<void> {
  await dbManager.initialize()
}

// 兼容性访问
const db = {
  get data() {
    return dbManager.getData()
  }
}

// 数据迁移由 @shared/schema 统一提供

// ===============================
// 高级日志系统（支持等级控制、轮转、结构化格式）
// ===============================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  component?: string
  meta?: Record<string, unknown>
  pid?: number
}

class Logger {
  private logLevel: LogLevel = 'info'
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private maxFiles = 5
  private logsDir: string | null = null
  private currentLogFile: string | null = null

  constructor() {
    this.initializeLogger()
  }

  private initializeLogger(): void {
    try {
      this.logsDir = join(getUserDataPath(), 'logs')
      if (!existsSync(this.logsDir)) {
        mkdirSync(this.logsDir, { recursive: true })
      }
      this.currentLogFile = join(this.logsDir, 'app.log')
    } catch (err) {
      console.warn('Failed to initialize logger:', err)
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private async rotateLogIfNeeded(): Promise<void> {
    if (!this.currentLogFile || !this.logsDir) return

    try {
      const stats = await fsPromises.stat(this.currentLogFile).catch(() => null)
      if (!stats || stats.size < this.maxFileSize) return

      // 创建轮转文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const rotatedFile = join(this.logsDir, `app-${timestamp}.log`)

      // 重命名当前日志文件
      await renameAsync(this.currentLogFile, rotatedFile)

      // 清理旧日志文件
      await this.cleanOldLogs()
    } catch (err) {
      console.warn('Failed to rotate log file:', err)
    }
  }

  private async cleanOldLogs(): Promise<void> {
    if (!this.logsDir) return

    try {
      const files = readdirSync(this.logsDir)
        .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
        .map((f) => ({
          name: f,
          path: join(this.logsDir!, f),
          stat: statSync(join(this.logsDir!, f))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())

      // 保留最新的 maxFiles 个文件，删除其余文件
      const filesToDelete = files.slice(this.maxFiles)
      for (const file of filesToDelete) {
        try {
          unlinkSync(file.path)
        } catch (err) {
          console.warn(`Failed to delete old log file ${file.name}:`, err)
        }
      }
    } catch (err) {
      console.warn('Failed to clean old logs:', err)
    }
  }

  async log(
    level: LogLevel,
    message: string,
    component?: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    if (!this.shouldLog(level)) return

    try {
      await this.rotateLogIfNeeded()

      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        component,
        meta,
        pid: process.pid
      }

      // 结构化JSON格式
      const logLine = JSON.stringify(logEntry) + '\n'

      if (this.currentLogFile) {
        await writeFileAsync(this.currentLogFile, logLine, { flag: 'a', encoding: 'utf-8' })
      }

      // 开发环境下同时输出到控制台
      if (process.env.NODE_ENV === 'development') {
        const colorize = (text: string, color: string) => {
          const colors = {
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            gray: '\x1b[90m',
            reset: '\x1b[0m'
          }
          return colors[color as keyof typeof colors] + text + colors.reset
        }

        const levelColors = {
          debug: 'gray',
          info: 'blue',
          warn: 'yellow',
          error: 'red'
        }

        const prefix = component ? `[${component}]` : ''
        const coloredLevel = colorize(level.toUpperCase(), levelColors[level])
        console.log(`${logEntry.timestamp} ${coloredLevel} ${prefix} ${message}`)

        if (meta && Object.keys(meta).length > 0) {
          console.log('  Meta:', meta)
        }
      }
    } catch (err) {
      // 日志记录失败时静默处理，避免影响主功能
      console.warn('Failed to write log:', err)
    }
  }

  // 便捷方法
  debug(message: string, component?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log('debug', message, component, meta)
  }

  info(message: string, component?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log('info', message, component, meta)
  }

  warn(message: string, component?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log('warn', message, component, meta)
  }

  error(message: string, component?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log('error', message, component, meta)
  }
}

// 全局日志实例
const logger = new Logger()

// 向后兼容的函数
async function writeLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string
): Promise<void> {
  return logger.log(level, message, 'main')
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
      logger.error('Error reading file', 'ipc-fs', {
        error: error instanceof Error ? error.message : String(error)
      })
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
      logger.error('Error saving file', 'ipc-fs', {
        error: error instanceof Error ? error.message : String(error)
      })
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
      logger.error('Error checking file exists', 'ipc-fs', {
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  })

  ipcMain.handle('fs:getUserDataPath', async () => {
    try {
      return getUserDataPath()
    } catch (error) {
      logger.error('Error getting user data path', 'ipc-fs', {
        error: error instanceof Error ? error.message : String(error)
      })
      return ''
    }
  })

  // 数据库API（使用事务性操作）
  ipcMain.handle('db:read', async () => {
    try {
      return await dbManager.safeRead()
    } catch (error) {
      logger.error('Error reading database', 'ipc-db', {
        error: error instanceof Error ? error.message : String(error)
      })
      return DEFAULT_DATA
    }
  })

  ipcMain.handle('db:write', async (_, data: Schema) => {
    try {
      return await dbManager.safeWrite(async () => {
        // 使用校验和迁移函数确保数据完整性
        return validateAndMigrateData(data)
      })
    } catch (error) {
      logger.error('Error writing to database', 'ipc-db', {
        error: error instanceof Error ? error.message : String(error)
      })
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
      logger.error('Error listing backups', 'backup', {
        error: err instanceof Error ? err.message : String(err)
      })
      return []
    }
  })

  ipcMain.handle('backup:create', async () => {
    try {
      const data = await dbManager.safeRead()
      const dir = getBackupDir()
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const filename = `backup-${ts}.json`
      const filepath = join(dir, filename)
      const tempFilepath = `${filepath}.tmp`

      // 原子性写入：先写临时文件再重命名
      await writeFileAsync(tempFilepath, JSON.stringify(data, null, 2), 'utf-8')
      await renameAsync(tempFilepath, filepath)

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
      logger.error('Error creating backup', 'backup', {
        error: err instanceof Error ? err.message : String(err)
      })
      // 清理可能的临时文件
      try {
        const dir = getBackupDir()
        const now = new Date()
        const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
        const tempFilepath = join(dir, `backup-${ts}.json.tmp`)
        if (existsSync(tempFilepath)) {
          unlinkSync(tempFilepath)
        }
      } catch (cleanupErr) {
        writeLog('debug', `Failed to cleanup temp backup file: ${cleanupErr}`)
      }
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

      // 使用事务性写入恢复数据（包含校验）
      const success = await dbManager.safeWrite(async () => {
        return validateAndMigrateData(data)
      })

      if (success) {
        // 通知渲染进程可自行刷新
        if (mainWindow) mainWindow.webContents.send('backup:restored')
        return { success: true }
      } else {
        return { success: false }
      }
    } catch (err) {
      logger.error('Error restoring backup', 'backup', {
        error: err instanceof Error ? err.message : String(err)
      })
      return { success: false }
    }
  })

  ipcMain.handle('backup:openFolder', async () => {
    try {
      const dir = getBackupDir()
      await shell.openPath(dir)
      return true
    } catch (err) {
      logger.error('Error opening backup folder', 'backup', {
        error: err instanceof Error ? err.message : String(err)
      })
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
        logger.error('Error showing notification', 'system', {
          error: error instanceof Error ? error.message : String(error)
        })
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
      logger.error('Error registering global shortcut', 'system', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  ipcMain.on('system:unregisterGlobalShortcut', (_, accelerator: string) => {
    try {
      globalShortcut.unregister(accelerator)
    } catch (error) {
      logger.error('Error unregistering global shortcut', 'system', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  ipcMain.on('system:unregisterAllShortcuts', () => {
    try {
      globalShortcut.unregisterAll()
    } catch (error) {
      logger.error('Error unregistering all shortcuts', 'system', {
        error: error instanceof Error ? error.message : String(error)
      })
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
      logger.error('Update check failed', 'updater', {
        error: err instanceof Error ? err.message : String(err)
      })
    }
  })

  ipcMain.on('update:quitAndInstall', () => {
    isQuitting = true
    autoUpdater.quitAndInstall()
  })

  // 日志API
  ipcMain.handle(
    'log:debug',
    async (_, message: string, component?: string, meta?: Record<string, unknown>) => {
      await logger.debug(message, component || 'renderer', meta)
    }
  )

  ipcMain.handle(
    'log:info',
    async (_, message: string, component?: string, meta?: Record<string, unknown>) => {
      await logger.info(message, component || 'renderer', meta)
    }
  )

  ipcMain.handle(
    'log:warn',
    async (_, message: string, component?: string, meta?: Record<string, unknown>) => {
      await logger.warn(message, component || 'renderer', meta)
    }
  )

  ipcMain.handle(
    'log:error',
    async (_, message: string, component?: string, meta?: Record<string, unknown>) => {
      await logger.error(message, component || 'renderer', meta)
    }
  )

  ipcMain.on('log:setLevel', (_, level: 'debug' | 'info' | 'warn' | 'error') => {
    logger.setLogLevel(level)
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
  ipcMain.on('ping', () => logger.debug('Received ping, sending pong', 'ipc'))
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
      logger.warn('Failed to set dev CSP headers', 'dev', {
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  // 托盘
  try {
    tray = new Tray(icon)
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
    logger.warn('Tray init failed', 'tray', {
      error: err instanceof Error ? err.message : String(err)
    })
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
