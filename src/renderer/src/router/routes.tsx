import type { RouteObject } from 'react-router-dom'
import { TimerPage, TasksPage, StatsPage, SettingsPage } from '@/pages'
import { useTimerStore } from '@/stores/timerStore'
import { useTaskStore } from '@/stores/taskStore'
import { useVersionStore } from '@/stores/versionStore'
import { FC } from 'react'

export type RouteConfig = RouteObject & {
  title: string
}

interface ErrorBoundaryProps {
  error: Error
}

// 路由加载器
const loaders = {
  timer: async () => {
    const { initialize } = useTimerStore.getState()
    if (!window.isTimerInitialized) {
      await initialize()
      window.isTimerInitialized = true
    }
    return null
  },
  tasks: async () => {
    const { initialize } = useTaskStore.getState()
    if (!window.isTaskStoreInitialized) {
      await initialize()
      window.isTaskStoreInitialized = true
    }
    return null
  },
  settings: async () => {
    const { initializeVersions } = useVersionStore.getState()
    await initializeVersions()
    return null
  }
}

// 错误处理
const errorBoundary = {
  timer: (({ error }: ErrorBoundaryProps) => (
    <div className="text-center">
      <h2 className="text-xl font-bold text-red-600">计时器加载失败</h2>
      <p className="text-gray-600">{error.message}</p>
    </div>
  )) as FC,
  tasks: (({ error }: ErrorBoundaryProps) => (
    <div className="text-center">
      <h2 className="text-xl font-bold text-red-600">任务列表加载失败</h2>
      <p className="text-gray-600">{error.message}</p>
    </div>
  )) as FC,
  settings: (({ error }: ErrorBoundaryProps) => (
    <div className="text-center">
      <h2 className="text-xl font-bold text-red-600">设置加载失败</h2>
      <p className="text-gray-600">{error.message}</p>
    </div>
  )) as FC
}

export const routes: RouteConfig[] = [
  {
    path: 'timer',
    Component: TimerPage,
    title: '番茄钟',
    loader: loaders.timer,
    ErrorBoundary: errorBoundary.timer
  },
  {
    path: 'tasks',
    Component: TasksPage,
    title: '任务',
    loader: loaders.tasks,
    ErrorBoundary: errorBoundary.tasks
  },
  {
    path: 'stats',
    Component: StatsPage,
    title: '统计'
  },
  {
    path: 'settings',
    Component: SettingsPage,
    title: '设置',
    loader: loaders.settings,
    ErrorBoundary: errorBoundary.settings
  }
]
 