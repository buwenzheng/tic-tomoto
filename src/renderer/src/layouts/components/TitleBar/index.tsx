import React, { memo } from 'react'
import clsx from 'clsx'
import { ThemeToggle } from '../ThemeToggle'
import { WindowControls } from '../WindowControls'
import { AppLogo } from './AppLogo'
import { usePlatform } from '@/hooks/usePlatform'

export const TitleBar: React.FC = memo(() => {
  const { isMacOS } = usePlatform()

  return (
    <div 
      className={clsx(
        "flex items-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700",
        isMacOS ? "px-[70px] py-1" : "px-4 py-1"
      )}
    >
      {/* Logo和标题区域 */}
      <div className={clsx(
        "flex items-center space-x-3 drag-region flex-1"
      )}>
        <AppLogo />
      </div>
      
      {/* 控制按钮区域 */}
      <div className={clsx(
        "flex items-center",
        isMacOS ? "space-x-1" : "space-x-2"
      )}>
        {isMacOS ? (
          <ThemeToggle />
        ) : (
          <>
            <ThemeToggle />
            <WindowControls />
          </>
        )}
      </div>
    </div>
  )
})

TitleBar.displayName = 'TitleBar' 