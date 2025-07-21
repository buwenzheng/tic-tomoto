import React, { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface ActivityBarItemProps {
  path: string
  label: string
  icon: React.FC<{ className?: string }>
  isActive: boolean
}

export const ActivityBarItem: React.FC<ActivityBarItemProps> = memo(({ path, label, icon: Icon, isActive }) => (
  <NavLink
    to={path}
    className={clsx(
      'relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 group',
      isActive
        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
    title={label}
  >
    <Icon className="w-5 h-5" />
    
    {isActive && (
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 dark:bg-primary-400 rounded-r"
        layoutId="activeIndicator"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
  </NavLink>
))

ActivityBarItem.displayName = 'ActivityBarItem' 