// 渲染进程日志系统
// 通过 IPC 发送到主进程的统一日志系统

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMeta {
  [key: string]: unknown
}

class RendererLogger {
  private logLevel: LogLevel = 'info'

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private async sendToMain(
    level: LogLevel,
    message: string,
    component?: string,
    meta?: LogMeta
  ): Promise<void> {
    try {
      // 如果有 tomatoAPI.log，通过 IPC 发送到主进程
      if ((window.tomatoAPI as any)?.log) {
        await (window.tomatoAPI as any).log[level](message, component, meta)
      } else {
        // 降级到控制台输出（开发环境）
        if (process.env.NODE_ENV === 'development') {
          const timestamp = new Date().toISOString()
          const prefix = component ? `[${component}]` : ''
          const levelUpper = level.toUpperCase()

          const consoleMethod =
            level === 'error'
              ? console.error
              : level === 'warn'
                ? console.warn
                : level === 'debug'
                  ? console.debug
                  : console.log

          consoleMethod(`${timestamp} ${levelUpper} ${prefix} ${message}`)

          if (meta && Object.keys(meta).length > 0) {
            consoleMethod('  Meta:', meta)
          }
        }
      }
    } catch (err) {
      // 日志发送失败时静默处理
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send log to main process:', err)
      }
    }
  }

  async log(level: LogLevel, message: string, component?: string, meta?: LogMeta): Promise<void> {
    if (!this.shouldLog(level)) return
    await this.sendToMain(level, message, component, meta)
  }

  // 便捷方法
  async debug(message: string, component?: string, meta?: LogMeta): Promise<void> {
    return this.log('debug', message, component, meta)
  }

  async info(message: string, component?: string, meta?: LogMeta): Promise<void> {
    return this.log('info', message, component, meta)
  }

  async warn(message: string, component?: string, meta?: LogMeta): Promise<void> {
    return this.log('warn', message, component, meta)
  }

  async error(message: string, component?: string, meta?: LogMeta): Promise<void> {
    return this.log('error', message, component, meta)
  }

  // 错误对象的便捷方法
  async logError(
    error: Error,
    message?: string,
    component?: string,
    additionalMeta?: LogMeta
  ): Promise<void> {
    const meta = {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...additionalMeta
    }

    const logMessage = message || `Unexpected error: ${error.message}`
    return this.error(logMessage, component, meta)
  }

  // 性能计时日志
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(label)
    }
  }

  timeEnd(label: string, component?: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(label)
      this.debug(`Timer [${label}] finished`, component)
    }
  }
}

// 全局日志实例
export const logger = new RendererLogger()

// 为了方便使用，也导出一些便捷函数
export const logDebug = (message: string, component?: string, meta?: LogMeta) =>
  logger.debug(message, component, meta)

export const logInfo = (message: string, component?: string, meta?: LogMeta) =>
  logger.info(message, component, meta)

export const logWarn = (message: string, component?: string, meta?: LogMeta) =>
  logger.warn(message, component, meta)

export const logError = (message: string, component?: string, meta?: LogMeta) =>
  logger.error(message, component, meta)

export const logException = (error: Error, message?: string, component?: string, meta?: LogMeta) =>
  logger.logError(error, message, component, meta)

// 全局错误处理
window.addEventListener('error', (event) => {
  logger.logError(event.error, 'Uncaught error', 'global', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  logger.logError(error, 'Unhandled promise rejection', 'global')
})

// 开发环境下设置为 debug 级别
if (process.env.NODE_ENV === 'development') {
  logger.setLogLevel('debug')
}
