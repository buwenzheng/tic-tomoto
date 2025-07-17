import React from 'react'
import { Router } from '@/router'
import { AppInitializer } from '@/components/AppInitializer'

const App: React.FC = () => {
  return (
    <AppInitializer>
      <Router />
    </AppInitializer>
  )
}

export default App
