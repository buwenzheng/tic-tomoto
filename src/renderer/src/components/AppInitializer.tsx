import React, { useState, useEffect } from 'react'
import { storage } from '@/services/storage'
import { useTheme } from '@/hooks/useTheme'
import { DEFAULT_DATA } from '@shared/schema'

interface AppInitializerProps {
  children: React.ReactNode
}

interface InitializationError {
  type: 'storage' | 'theme' | 'other'
  message: string
}

// 使用共享 DEFAULT_DATA 作为复位数据来源

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<InitializationError | null>(null)
  const { setTheme } = useTheme()

  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        // 初始化存储
        await storage.read()

        // 初始化主题
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme) {
          setTheme(savedTheme === 'dark')
        }

        // 初始化系统快捷键
        if (window.tomatoAPI?.system?.registerGlobalShortcut) {
          try {
            // 注册全局快捷键
            window.tomatoAPI.system.registerGlobalShortcut('CommandOrControl+Shift+T')
          } catch (shortcutError) {
            console.warn('Failed to register global shortcut:', shortcutError)
            // 快捷键注册失败不影响应用继续运行
          }
        }

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)

        // 确保错误消息是字符串
        const errorMessage = error instanceof Error ? error.message : '应用初始化失败'

        setError({
          type: errorMessage.toLowerCase().includes('storage')
            ? 'storage'
            : errorMessage.toLowerCase().includes('theme')
              ? 'theme'
              : 'other',
          message: errorMessage
        })

        // 如果是存储错误，尝试重置存储
        if (errorMessage.toLowerCase().includes('storage')) {
          try {
            localStorage.clear()
            await storage.write(DEFAULT_DATA)
            // 重置成功后继续运行
            setIsInitialized(true)
            return
          } catch (resetError) {
            console.error('Failed to reset storage:', resetError)
          }
        }

        // 继续运行，使用默认数据
        setIsInitialized(true)
      }
    }

    initializeApp()

    // 清理函数
    return () => {
      if (window.tomatoAPI?.system?.unregisterGlobalShortcut) {
        window.tomatoAPI.system.unregisterGlobalShortcut('CommandOrControl+Shift+T')
      }
    }
  }, [setTheme])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg">!</span>
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {error.type === 'storage'
              ? '存储初始化失败'
              : error.type === 'theme'
                ? '主题初始化失败'
                : '应用初始化失败'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            >
              重试
            </button>
            {error.type === 'storage' && (
              <button
                onClick={async () => {
                  try {
                    localStorage.clear()
                    await storage.write(DEFAULT_DATA)
                    window.location.reload()
                  } catch (resetError) {
                    console.error('Failed to reset storage:', resetError)
                  }
                }}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                重置数据
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg">🍅</span>
          </div>
          <div className="shimmer w-32 h-4 rounded mx-auto"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
