import { Clock, CheckSquare, BarChart3, Settings } from 'lucide-react'

export const navigationItems = [
  { path: 'timer', label: '计时器', icon: Clock },
  { path: 'tasks', label: '任务', icon: CheckSquare },
  { path: 'stats', label: '统计', icon: BarChart3 },
  { path: 'settings', label: '设置', icon: Settings }
] as const 