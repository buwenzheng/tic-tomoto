import React from 'react'
import { Outlet } from 'react-router-dom'
import { TitleBar } from './components/TitleBar'
import { ActivityBar } from './components/ActivityBar'
import { PageTransition } from './components/PageTransition'

export const MainLayout: React.FC = () => {
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
} 