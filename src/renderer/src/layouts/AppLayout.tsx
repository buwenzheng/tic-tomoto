import React, { useState, useEffect, memo } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckSquare, BarChart3, Settings, Sun, Moon } from 'lucide-react'
import clsx from 'clsx'

// 导航项配置
const navigationItems = [
  { path: 'timer', label: '计时器', icon: Clock },
  { path: 'tasks', label: '任务', icon: CheckSquare },
  { path: 'stats', label: '统计', icon: BarChart3 },
  { path: 'settings', label: '设置', icon: Settings }
]

// Logo组件
const Logo: React.FC = memo(() => (
  <div className="flex items-center space-x-3">
    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
      <span className="text-white text-lg">🍅</span>
    </div>
    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">番茄时钟</h1>
  </div>
))

Logo.displayName = 'Logo'

// 导航链接组件
interface NavItemProps {
  path: string
  label: string
  icon: React.FC<{ className?: string }>
  isActive: boolean
}

const NavItem: React.FC<NavItemProps> = memo(({ path, label, icon: Icon, isActive }) => (
  <NavLink
    to={path}
    className={clsx(
      'relative px-4 py-2 rounded-lg font-medium transition-all duration-200',
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
  >
    <div className="flex items-center space-x-2">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>

    {isActive && (
      <motion.div
        className="absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-lg -z-10"
        layoutId="activeTab"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
  </NavLink>
))

NavItem.displayName = 'NavItem'

// 主题切换组件
const ThemeToggle: React.FC = memo(() => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 检查系统主题偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent): void => {
      setIsDark(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // 应用主题
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = (): void => {
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  )
})

ThemeToggle.displayName = 'ThemeToggle'

// 导航栏组件
const Navigation: React.FC = memo(() => {
  const location = useLocation()
  const currentPath = location.pathname.slice(1) // 移除开头的 '/'

  return (
    <nav className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <Logo />

      {/* 导航标签 */}
      <div className="flex items-center space-x-1">
        {navigationItems.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            label={item.label}
            icon={item.icon}
            isActive={currentPath === item.path}
          />
        ))}
      </div>

      <ThemeToggle />
    </nav>
  )
})

Navigation.displayName = 'Navigation'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 dark:text-gray-600">
        <p>番茄时钟 v1.0.0 - 专注工作，高效生活</p>
      </footer>
    </div>
  )
}
