import type { RouteObject } from 'react-router-dom'
import { TimerPage, TasksPage, StatsPage, SettingsPage } from '@/pages'

export type RouteConfig = Omit<RouteObject, 'children'> & {
  title: string
}

export const routes: RouteConfig[] = [
  {
    path: '/timer',
    element: <TimerPage />,
    title: '番茄钟'
  },
  {
    path: '/tasks',
    element: <TasksPage />,
    title: '任务'
  },
  {
    path: '/stats',
    element: <StatsPage />,
    title: '统计'
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    title: '设置'
  }
]
