import React from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { routes } from './routes'
import { TimerPage } from '@/pages'

const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <TimerPage />
      },
      ...routes
    ]
  }
])

export const Router: React.FC = () => {
  return <RouterProvider router={router} />
}
