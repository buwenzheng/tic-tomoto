import React, { useState, useEffect, memo } from 'react'
import { Sun, Moon } from 'lucide-react'

export const ThemeToggle: React.FC = memo(() => {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
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