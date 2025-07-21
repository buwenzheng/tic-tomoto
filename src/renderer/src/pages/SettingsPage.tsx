import React, { useEffect } from 'react'
import { useVersionStore } from '@/stores/versionStore'

const SettingsPage: React.FC = () => {
  const { 
    appVersion, 
    electronVersion, 
    chromeVersion, 
    nodeVersion,
    isLoading,
    initializeVersions 
  } = useVersionStore()

  useEffect(() => {
    initializeVersions()
  }, [initializeVersions])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">设置</h1>

      {/* 版本信息 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">关于</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>版本：v{appVersion}</p>
            <p>Electron：v{electronVersion}</p>
            <p>Chrome：v{chromeVersion}</p>
            <p>Node：v{nodeVersion}</p>
          </div>
        )}
      </div>

      {/* 其他设置选项 */}
    </div>
  )
}

export default SettingsPage
