import React from 'react'

export const AppLogo: React.FC = () => {
  return (
    <>
      <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded flex items-center justify-center">
        <span className="text-white text-sm">🍅</span>
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">番茄时钟</span>
    </>
  )
}

AppLogo.displayName = 'AppLogo' 