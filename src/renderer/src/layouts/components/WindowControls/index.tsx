import React, { memo } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'

export const WindowControls: React.FC = memo(() => {
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