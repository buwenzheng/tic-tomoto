import React, { useState, useEffect } from 'react'
import { storage } from '@/services/storage'
import { useTheme } from '@/hooks/useTheme'
import { DEFAULT_DATA } from '@shared/schema'
import { LoadingState, ErrorState } from '@/components/LoadingState'

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
    const errorType =
      error.type === 'storage' ? 'storage' : error.type === 'theme' ? 'unknown' : 'unknown'

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <ErrorState
          title={
            error.type === 'storage'
              ? '存储初始化失败'
              : error.type === 'theme'
                ? '主题初始化失败'
                : '应用初始化失败'
          }
          message={error.message}
          type={errorType}
          size="lg"
          onRetry={() => window.location.reload()}
          className="max-w-md"
        />
        {error.type === 'storage' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
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
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
            >
              重置所有数据
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingState type="default" message="正在初始化应用..." size="lg" />
      </div>
    )
  }

  return <>{children}</>
}
