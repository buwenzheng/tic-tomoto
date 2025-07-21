import type { RouteObject } from 'react-router-dom'
import { TimerPage, TasksPage, StatsPage, SettingsPage } from '@/pages'

export type RouteConfig = RouteObject & {
  title: string
}

export const routes: RouteConfig[] = [
  {
    path: 'timer',
    Component: TimerPage,
    title: '番茄钟'
    // 可以在这里添加 loader 函数来预加载数据
    // loader: async () => {
    //   // 预加载番茄钟相关数据
    //   return { /* 数据 */ }
    // }
  },
  {
    path: 'tasks',
    Component: TasksPage,
    title: '任务'
    // 可以在这里添加 loader 函数来预加载任务数据
    // loader: async () => {
    //   // 预加载任务列表数据
    //   return { /* 数据 */ }
    // }
  },
  {
    path: 'stats',
    Component: StatsPage,
    title: '统计'
    // 可以在这里添加 loader 函数来预加载统计数据
    // loader: async () => {
    //   // 预加载统计数据
    //   return { /* 数据 */ }
    // }
  },
  {
    path: 'settings',
    Component: SettingsPage,
    title: '设置'
    // 可以在这里添加 loader 函数来预加载设置数据
    // loader: async () => {
    //   // 预加载用户设置数据
    //   return { /* 数据 */ }
    // }
  }
]
 