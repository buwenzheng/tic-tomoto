// 组件性能监控系统
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from './logger'

// ===============================
// 性能指标接口
// ===============================

interface PerformanceMetrics {
  componentName: string
  renderTime: number
  renderCount: number
  memoryUsage?: MemoryInfo
  timestamp: number
}

interface MemoryInfo {
  used: number // MB
  total: number // MB
  limit: number // MB
}

interface RenderProfile {
  startTime: number
  endTime?: number
  duration?: number
  phase: 'mount' | 'update' | 'unmount'
}

// ===============================
// 性能监控配置
// ===============================

interface PerformanceConfig {
  enableLogging: boolean
  logThreshold: number // 超过此时间（ms）才记录日志
  memoryMonitoring: boolean
  memoryCheckInterval: number // 内存检查间隔（ms）
  maxRenderCount: number // 最大渲染次数警告阈值
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableLogging: process.env.NODE_ENV === 'development',
  logThreshold: 16, // 一帧的时间
  memoryMonitoring: true,
  memoryCheckInterval: 30000, // 30秒
  maxRenderCount: 100
}

// ===============================
// 性能监控管理器
// ===============================

class PerformanceMonitor {
  private config: PerformanceConfig
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private memoryTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startMemoryMonitoring()
  }

  private startMemoryMonitoring(): void {
    if (!this.config.memoryMonitoring) return

    this.memoryTimer = setInterval(() => {
      this.recordMemoryUsage()
    }, this.config.memoryCheckInterval)
  }

  private getMemoryInfo(): MemoryInfo | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // 转换为MB
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
      }
    }
    return undefined
  }

  private recordMemoryUsage(): void {
    const memoryInfo = this.getMemoryInfo()
    if (memoryInfo) {
      logger.debug('Memory usage check', 'performance', {
        memoryUsed: memoryInfo.used,
        memoryTotal: memoryInfo.total,
        memoryLimit: memoryInfo.limit,
        usagePercentage: Math.round((memoryInfo.used / memoryInfo.limit) * 100)
      })

      // 内存使用超过80%时警告
      if (memoryInfo.used / memoryInfo.limit > 0.8) {
        logger.warn('High memory usage detected', 'performance', {
          memoryUsed: memoryInfo.used,
          memoryLimit: memoryInfo.limit,
          usagePercentage: Math.round((memoryInfo.used / memoryInfo.limit) * 100)
        })
      }
    }
  }

  recordRender(componentName: string, renderTime: number): void {
    if (!this.config.enableLogging) return

    const now = Date.now()
    const existingMetrics = this.metrics.get(componentName) || []

    const newMetric: PerformanceMetrics = {
      componentName,
      renderTime,
      renderCount: existingMetrics.length + 1,
      memoryUsage: this.getMemoryInfo(),
      timestamp: now
    }

    existingMetrics.push(newMetric)
    this.metrics.set(componentName, existingMetrics)

    // 记录日志
    if (renderTime > this.config.logThreshold) {
      logger.warn(`Slow render detected`, 'performance', {
        component: componentName,
        renderTime: Math.round(renderTime * 100) / 100,
        renderCount: newMetric.renderCount,
        threshold: this.config.logThreshold
      })
    }

    // 检查渲染次数是否过多
    if (newMetric.renderCount > this.config.maxRenderCount) {
      logger.warn(`High render count detected`, 'performance', {
        component: componentName,
        renderCount: newMetric.renderCount,
        maxRenderCount: this.config.maxRenderCount
      })
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.get(componentName) || []
    }

    const allMetrics: PerformanceMetrics[] = []
    this.metrics.forEach((metrics) => allMetrics.push(...metrics))
    return allMetrics
  }

  clearMetrics(componentName?: string): void {
    if (componentName) {
      this.metrics.delete(componentName)
    } else {
      this.metrics.clear()
    }
  }

  generateReport(): string {
    const report: string[] = ['=== Performance Report ===']

    this.metrics.forEach((metrics, componentName) => {
      const averageRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length
      const maxRenderTime = Math.max(...metrics.map((m) => m.renderTime))
      const totalRenderCount = metrics.length

      report.push(`\nComponent: ${componentName}`)
      report.push(`  Total Renders: ${totalRenderCount}`)
      report.push(`  Average Render Time: ${Math.round(averageRenderTime * 100) / 100}ms`)
      report.push(`  Max Render Time: ${Math.round(maxRenderTime * 100) / 100}ms`)
    })

    return report.join('\n')
  }

  destroy(): void {
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }
    this.metrics.clear()
  }
}

// 全局性能监控实例
const performanceMonitor = new PerformanceMonitor()

// ===============================
// 性能监控 HOC
// ===============================

interface WithPerformanceMonitoringProps {
  enablePerfMonitoring?: boolean
}

export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ComponentWithPerformanceMonitoring = React.memo<P & WithPerformanceMonitoringProps>(
    (props) => {
      const { enablePerfMonitoring = true, ...restProps } = props
      const displayName =
        componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'
      const renderStartTime = useRef<number>(0)
      const renderCount = useRef<number>(0)
      const isMounted = useRef<boolean>(false)

      // 记录渲染开始时间
      renderStartTime.current = performance.now()
      renderCount.current += 1

      useEffect(() => {
        isMounted.current = true

        // 记录首次挂载时间
        const mountTime = performance.now() - renderStartTime.current
        if (enablePerfMonitoring) {
          performanceMonitor.recordRender(`${displayName}:mount`, mountTime)
          logger.debug(`Component mounted`, 'performance', {
            component: displayName,
            mountTime: Math.round(mountTime * 100) / 100,
            renderCount: renderCount.current
          })
        }

        return () => {
          isMounted.current = false
          logger.debug(`Component unmounted`, 'performance', {
            component: displayName,
            totalRenders: renderCount.current
          })
        }
      }, [displayName, enablePerfMonitoring])

      useEffect(() => {
        // 记录更新渲染时间（不包括首次挂载）
        if (isMounted.current && enablePerfMonitoring) {
          const renderTime = performance.now() - renderStartTime.current
          performanceMonitor.recordRender(`${displayName}:update`, renderTime)
        }
      })

      return React.createElement(WrappedComponent, restProps as P)
    }
  )

  ComponentWithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${componentName || WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithPerformanceMonitoring
}

// ===============================
// 内存监控 Hook
// ===============================

export function useMemoryMonitoring(componentName: string, checkInterval = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const info: MemoryInfo = {
        used: Math.round(memory.usedJSHeapSize / 1048576),
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
      }
      setMemoryInfo(info)

      // 记录组件级别的内存使用
      logger.debug(`Memory check for ${componentName}`, 'memory', {
        component: componentName,
        ...info
      })
    }
  }, [componentName])

  useEffect(() => {
    // 立即检查一次
    checkMemory()

    // 设置定期检查
    intervalRef.current = setInterval(checkMemory, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [checkMemory, checkInterval])

  return memoryInfo
}

// ===============================
// 渲染时间追踪 Hook
// ===============================

export function useRenderTracker(componentName: string) {
  const renderStartTime = useRef<number>(0)
  const renderHistory = useRef<number[]>([])

  // 记录渲染开始时间
  renderStartTime.current = performance.now()

  useEffect(() => {
    // 记录渲染完成时间
    const renderTime = performance.now() - renderStartTime.current
    renderHistory.current.push(renderTime)

    // 保留最近50次渲染记录
    if (renderHistory.current.length > 50) {
      renderHistory.current = renderHistory.current.slice(-50)
    }

    // 计算平均渲染时间
    const avgRenderTime =
      renderHistory.current.reduce((sum, time) => sum + time, 0) / renderHistory.current.length

    logger.debug(`Render tracked for ${componentName}`, 'render-tracker', {
      component: componentName,
      currentRenderTime: Math.round(renderTime * 100) / 100,
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      renderCount: renderHistory.current.length
    })

    // 如果渲染时间显著高于平均值，记录警告
    if (renderTime > avgRenderTime * 2 && renderTime > 16) {
      logger.warn(`Unusually slow render detected`, 'render-tracker', {
        component: componentName,
        renderTime: Math.round(renderTime * 100) / 100,
        averageRenderTime: Math.round(avgRenderTime * 100) / 100,
        threshold: Math.round(avgRenderTime * 2 * 100) / 100
      })
    }
  })

  return {
    currentRenderTime: renderStartTime.current,
    averageRenderTime:
      renderHistory.current.length > 0
        ? renderHistory.current.reduce((sum, time) => sum + time, 0) / renderHistory.current.length
        : 0,
    renderCount: renderHistory.current.length
  }
}

// ===============================
// 导出性能监控工具
// ===============================

export { performanceMonitor, PerformanceMonitor }
export type { PerformanceMetrics, MemoryInfo, PerformanceConfig }

// 开发环境下在控制台暴露性能监控器
if (process.env.NODE_ENV === 'development') {
  ;(window as any).performanceMonitor = performanceMonitor
}
