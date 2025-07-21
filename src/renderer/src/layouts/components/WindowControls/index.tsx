import React, { memo } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'
import { useWindowControls } from '@/hooks/useWindowControls'

export const WindowControls: React.FC = memo(() => {
  const { handleMinimize, handleMaximize, handleClose } = useWindowControls()

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