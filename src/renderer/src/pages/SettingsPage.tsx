import React, { useEffect, useState, useCallback } from 'react'
import { useVersionStore } from '@/stores/versionStore'
import { useStorage } from '@/hooks/useStorage'

const SettingsPage: React.FC = () => {
  const { appVersion, electronVersion, chromeVersion, nodeVersion, isLoading, initializeVersions } =
    useVersionStore()
  const [backups, setBackups] = useState<string[]>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const { data, updateData } = useStorage()
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [updateProgress, setUpdateProgress] = useState<number | null>(null)

  useEffect(() => {
    initializeVersions()
  }, [initializeVersions])

  const refreshBackups = useCallback(async () => {
    if (!window.tomatoAPI?.backup?.list) return
    try {
      setBackupLoading(true)
      const list = await window.tomatoAPI.backup.list()
      setBackups(list)
    } catch (err) {
      console.error('Failed to list backups:', err)
    } finally {
      setBackupLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBackups()
    const handler = () => {
      setBackupMessage('备份已恢复')
      refreshBackups()
    }
    window.tomatoAPI?.backup?.onRestored(handler)
    // 订阅更新事件
    window.tomatoAPI?.update?.onAvailable(() => setUpdateStatus('发现新版本，正在下载...'))
    window.tomatoAPI?.update?.onNotAvailable(() => setUpdateStatus('当前已是最新版本'))
    window.tomatoAPI?.update?.onError((_, msg) => setUpdateStatus(`检查更新失败：${msg}`))
    window.tomatoAPI?.update?.onProgress((_, info) => {
      const p = info?.percent ?? 0
      setUpdateProgress(Math.round(p))
    })
    window.tomatoAPI?.update?.onDownloaded(() =>
      setUpdateStatus('更新下载完成，点击安装以重启应用')
    )
  }, [refreshBackups])

  const handleCreateBackup = async (): Promise<void> => {
    if (!window.tomatoAPI?.backup?.create) return
    setBackupMessage(null)
    setBackupLoading(true)
    try {
      const res = await window.tomatoAPI.backup.create()
      if (res?.success) {
        setBackupMessage(`备份创建成功：${res.filename}`)
        refreshBackups()
      } else {
        setBackupMessage('备份创建失败')
      }
    } catch (err) {
      console.error('Failed to create backup:', err)
      setBackupMessage('备份创建失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestore = async (filename: string): Promise<void> => {
    if (!window.tomatoAPI?.backup?.restore) return
    setBackupMessage(null)
    setBackupLoading(true)
    try {
      const res = await window.tomatoAPI.backup.restore(filename)
      if (res?.success) {
        setBackupMessage(`已恢复：${filename}`)
      } else {
        setBackupMessage('恢复失败')
      }
    } catch (err) {
      console.error('Failed to restore backup:', err)
      setBackupMessage('恢复失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    if (!window.tomatoAPI?.backup?.openFolder) return
    try {
      await window.tomatoAPI.backup.openFolder()
    } catch (err) {
      console.error('Failed to open backup folder:', err)
    }
  }

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

      {/* 数据备份与恢复 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          数据备份与恢复
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleCreateBackup} disabled={backupLoading} className="btn-primary">
            创建备份
          </button>
          <button onClick={refreshBackups} disabled={backupLoading} className="btn-secondary">
            刷新列表
          </button>
          <button onClick={handleOpenFolder} className="btn-ghost">
            打开备份目录
          </button>
        </div>
        {backupMessage && (
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">{backupMessage}</div>
        )}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {backupLoading ? (
            <div className="p-4 text-center">
              <div className="shimmer w-full h-8 rounded"></div>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">暂无备份</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {backups.map((f) => (
                <li key={f} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                  <button
                    onClick={() => handleRestore(f)}
                    disabled={backupLoading}
                    className="px-3 py-1 text-sm bg-secondary-500 text-white rounded hover:bg-secondary-600"
                  >
                    恢复
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 行为设置 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">行为设置</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">最小化到托盘</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              关闭窗口时隐藏到系统托盘而不是退出应用
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={!!data.settings?.minimizeToTray}
              onChange={(e) => {
                updateData({
                  settings: { ...data.settings, minimizeToTray: e.target.checked } as any
                })
              }}
            />
            <span className="w-10 h-6 bg-gray-300 rounded-full p-1 transition-colors duration-200 dark:bg-gray-700">
              <span
                className={`block w-4 h-4 bg-white rounded-full transition-transform duration-200 ${data.settings?.minimizeToTray ? 'translate-x-4' : ''}`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      {/* 应用更新 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">应用更新</h2>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => {
              setUpdateStatus('正在检查更新...')
              setUpdateProgress(null)
              window.tomatoAPI?.update?.check()
            }}
            className="btn-primary"
          >
            检查更新
          </button>
          <button
            onClick={() => window.tomatoAPI?.update?.quitAndInstall()}
            className="btn-secondary"
          >
            安装更新并重启
          </button>
        </div>
        {!!updateStatus && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{updateStatus}</div>
        )}
        {updateProgress !== null && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
            <div className="h-2 bg-primary-500 rounded" style={{ width: `${updateProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
