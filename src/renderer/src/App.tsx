import React from 'react'
import { Router } from '@/router'
import { AppInitializer } from '@/components/AppInitializer'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const App: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="应用启动失败"
      fallbackMessage="应用遇到了严重错误。请尝试重新启动应用或联系技术支持。"
      showReportButton={true}
    >
      <AppInitializer>
        <Router />
      </AppInitializer>
    </ErrorBoundary>
  )
}

export default App
