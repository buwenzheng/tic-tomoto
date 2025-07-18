import React, { useState, useEffect } from 'react'
import { storage, StorageFactory } from '@/services/storage'

interface AppInitializerProps {
  children: React.ReactNode
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化存储
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        // 尝试读取存储以确保它已初始化
        await storage.read()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        // 继续运行，使用默认数据
        setIsInitialized(true)
      }
    }

    initializeApp()
  }, [])

  // 加载状态
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
 