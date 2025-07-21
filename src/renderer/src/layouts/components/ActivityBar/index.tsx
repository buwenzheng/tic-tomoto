import React, { memo } from 'react'
import { useLocation } from 'react-router-dom'
import { navigationItems } from './config'
import { ActivityBarItem } from './ActivityBarItem'

export const ActivityBar: React.FC = memo(() => {
  const location = useLocation()
  const currentPath = location.pathname === '/' ? 'timer' : location.pathname.slice(1)

  return (
    <aside className="w-16 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-2">
      {navigationItems.map((item) => (
        <ActivityBarItem
          key={item.path}
          path={item.path}
          label={item.label}
          icon={item.icon}
          isActive={currentPath === item.path}
        />
      ))}
    </aside>
  )
})

ActivityBar.displayName = 'ActivityBar' 