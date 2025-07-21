import React, { useState, useEffect, memo } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckSquare, BarChart3, Settings, Sun, Moon, Minus, Maximize2, X } from 'lucide-react'
import clsx from 'clsx'

// 导航项配置
const navigationItems = [
  { path: 'timer', label: '计时器', icon: Clock },
  { path: 'tasks', label: '任务', icon: CheckSquare },
  { path: 'stats', label: '统计', icon: BarChart3 },
  { path: 'settings', label: '设置', icon: Settings }
]

// 主题切换组件
const ThemeToggle: React.FC = memo(() => {
  const [isDark, setIsDark] = useState(() => {
    // 检查本地存储的主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // 检查系统主题偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // 应用主题到DOM
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = (): void => {
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-drag-region pointer-events-auto"
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" />
      ) : (
        <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" />
      )}
    </button>
  )
})

ThemeToggle.displayName = 'ThemeToggle'

// 窗口控制按钮组件
const WindowControls: React.FC = memo(() => {
  const handleMinimize = (): void => {
    if (window.tomatoAPI?.window?.minimize) {
      window.tomatoAPI.window.minimize()
    }
  }

  const handleMaximize = async (): Promise<void> => {
    const win = window.tomatoAPI?.window
    if (win?.isMaximized && win?.maximize && win?.unmaximize) {
      try {
        const isMaximized = await win.isMaximized()
        if (isMaximized) {
          win.unmaximize()
        } else {
          win.maximize()
        }
      } catch (error) {
        console.error('Failed to toggle maximize:', error)
      }
    }
  }

  const handleClose = (): void => {
    if (window.tomatoAPI?.window?.close) {
      window.tomatoAPI.window.close()
    }
  }

  return (
    <div className="flex items-center space-x-1 no-drag-region">
      <button
        onClick={handleMinimize}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="最小化"
      >
        <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      <button
        onClick={handleMaximize}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="最大化/还原"
      >
        <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      <button
        onClick={handleClose}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="关闭"
      >
        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  )
})

WindowControls.displayName = 'WindowControls'

// 顶部标题栏组件
const TitleBar: React.FC = memo(() => {
  const isMacOS = window.tomatoAPI?.platform === 'darwin'

  return (
    <div 
      className={clsx(
        "flex items-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700",
        // macOS下调整左右padding，右侧padding减小以减少空白
        isMacOS ? "px-[70px] py-2" : "px-4 py-2"
      )}
    >
      {/* Logo和标题区域 */}
      <div className={clsx(
        "flex items-center space-x-3 drag-region",
        // 在macOS上让Logo区域居中，在其他平台上靠左对齐
        isMacOS ? "flex-1 justify-center" : "flex-1"
      )}>
        <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded flex items-center justify-center">
          <span className="text-white text-sm">🍅</span>
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">番茄时钟</span>
      </div>
      
      {/* 控制按钮区域 */}
      <div className={clsx(
        "flex items-center",
        isMacOS ? "space-x-1" : "space-x-2"
      )}>
        {/* 在macOS上，主题切换按钮不需要额外的右边距 */}
        {isMacOS ? (
          <ThemeToggle />
        ) : (
          <>
            <ThemeToggle />
            <WindowControls />
          </>
        )}
      </div>
    </div>
  )
})

TitleBar.displayName = 'TitleBar'

// 活动栏导航项组件
interface ActivityBarItemProps {
  path: string
  label: string
  icon: React.FC<{ className?: string }>
  isActive: boolean
}

const ActivityBarItem: React.FC<ActivityBarItemProps> = memo(({ path, label, icon: Icon, isActive }) => (
  <NavLink
    to={path}
    className={clsx(
      'relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 group',
      isActive
        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
    title={label}
  >
    <Icon className="w-5 h-5" />
    
    {isActive && (
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 dark:bg-primary-400 rounded-r"
        layoutId="activeIndicator"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
  </NavLink>
))

ActivityBarItem.displayName = 'ActivityBarItem'

// 活动栏组件
const ActivityBar: React.FC = memo(() => {
  const location = useLocation()
  const currentPath = location.pathname.slice(1)

  return (
    <aside className="w-16 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-2">
      {navigationItems.map((item) => (
        <ActivityBarItem
          key={item.path}
          path={item.path}
          label={item.label}
          icon={item.icon}
          isActive={currentPath === item.path}
        />
      ))}
    </aside>
  )
})

ActivityBar.displayName = 'ActivityBar'

// 页面过渡动画组件
const PageTransition: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
})

PageTransition.displayName = 'PageTransition'

// 应用布局组件
export const AppLayout: React.FC = () => {
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
          
          <footer className="text-center py-4 text-xs text-gray-400 dark:text-gray-600">
            <p>番茄时钟 v1.0.0 - 专注工作，高效生活</p>
          </footer>
        </main>
      </div>
    </div>
  )
}
 