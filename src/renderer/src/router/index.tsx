import React from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { routes } from './routes'
import { TimerPage } from '@/pages'

// 错误处理组件
const ErrorBoundary = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">出错了！</h1>
        <p className="text-gray-600 mb-4">页面加载时发生了错误</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重新加载
        </button>
      </div>
    </div>
  )
}

// 创建路由器 - React Router v7 配置
const router = createHashRouter([
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary,
    children: [
      {
        index: true,
        Component: TimerPage
      },
      ...routes
    ]
  }
])

export const Router: React.FC = () => {
  return <RouterProvider router={router} />
}
 