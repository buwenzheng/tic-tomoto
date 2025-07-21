import React, { memo } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export const ThemeToggle: React.FC = memo(() => {
  const { isDark, toggleTheme } = useTheme()

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