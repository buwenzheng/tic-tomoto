# 性能监控系统使用指南

## 概述

性能监控系统提供了全面的组件性能分析工具，包括渲染时间监控、内存使用追踪和自动性能警告。

## 核心功能

### 1. 性能监控 HOC

用于包装组件并自动监控其渲染性能：

```tsx
import { withPerformanceMonitoring } from '@/utils/performance'

const MyComponent = () => {
  return <div>Hello World</div>
}

// 应用性能监控
export default withPerformanceMonitoring(MyComponent, 'MyComponent')

// 或者禁用性能监控
export const MyComponentWithoutMonitoring = withPerformanceMonitoring(
  MyComponent,
  'MyComponent'
)

// 在使用时禁用：
<MyComponentWithoutMonitoring enablePerfMonitoring={false} />
```

### 2. 内存监控 Hook

监控组件级别的内存使用：

```tsx
import { useMemoryMonitoring } from '@/utils/performance'

const MyComponent = () => {
  const memoryInfo = useMemoryMonitoring('MyComponent', 10000) // 每10秒检查一次

  return (
    <div>
      {memoryInfo && (
        <div>
          内存使用: {memoryInfo.used}MB / {memoryInfo.limit}MB
        </div>
      )}
    </div>
  )
}
```

### 3. 渲染时间追踪 Hook

追踪组件的渲染时间和历史：

```tsx
import { useRenderTracker } from '@/utils/performance'

const MyComponent = () => {
  const { currentRenderTime, averageRenderTime, renderCount } = useRenderTracker('MyComponent')

  return (
    <div>
      <p>当前渲染时间: {currentRenderTime.toFixed(2)}ms</p>
      <p>平均渲染时间: {averageRenderTime.toFixed(2)}ms</p>
      <p>渲染次数: {renderCount}</p>
    </div>
  )
}
```

### 4. 性能监控管理器

直接使用性能监控管理器：

```tsx
import { performanceMonitor } from '@/utils/performance'

// 获取组件性能指标
const metrics = performanceMonitor.getMetrics('MyComponent')

// 生成性能报告
const report = performanceMonitor.generateReport()
console.log(report)

// 清理特定组件的指标
performanceMonitor.clearMetrics('MyComponent')

// 清理所有指标
performanceMonitor.clearMetrics()
```

## 配置选项

可以自定义性能监控配置：

```tsx
import { PerformanceMonitor } from '@/utils/performance'

const customMonitor = new PerformanceMonitor({
  enableLogging: true,
  logThreshold: 50, // 超过50ms才记录
  memoryMonitoring: true,
  memoryCheckInterval: 60000, // 每分钟检查内存
  maxRenderCount: 50 // 超过50次渲染发出警告
})
```

## 自动警告

系统会在以下情况自动发出警告：

1. **慢渲染警告**: 渲染时间超过阈值（默认16ms）
2. **高渲染次数警告**: 渲染次数超过阈值（默认100次）
3. **高内存使用警告**: 内存使用超过80%
4. **异常慢渲染警告**: 渲染时间显著高于平均值

## 开发工具

在开发环境下，性能监控器会暴露到全局：

```javascript
// 在浏览器控制台中使用
window.performanceMonitor.generateReport()
window.performanceMonitor.getMetrics()
```

## 最佳实践

1. **选择性使用**: 只在关键组件上使用性能监控
2. **生产环境**: 在生产环境中禁用详细的性能日志
3. **阈值调整**: 根据应用特点调整警告阈值
4. **定期清理**: 定期清理性能指标以避免内存泄漏
5. **结合日志**: 性能监控会自动记录到日志系统中

## 示例集成

```tsx
// 示例：为关键组件添加性能监控
import {
  withPerformanceMonitoring,
  useMemoryMonitoring,
  useRenderTracker
} from '@/utils/performance'

const TaskListComponent = () => {
  const memoryInfo = useMemoryMonitoring('TaskList')
  const renderStats = useRenderTracker('TaskList')

  // 组件逻辑...

  return (
    <div>
      {/* 组件内容... */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '12px', color: '#666', position: 'fixed', bottom: 0, right: 0 }}>
          Renders: {renderStats.renderCount} | Avg: {renderStats.averageRenderTime.toFixed(2)}ms |
          Memory: {memoryInfo?.used}MB
        </div>
      )}
    </div>
  )
}

export default withPerformanceMonitoring(TaskListComponent, 'TaskList')
```

这个性能监控系统可以帮助你：

- 识别性能瓶颈组件
- 监控内存使用情况
- 追踪渲染性能趋势
- 自动发现性能问题
- 生成详细的性能报告
