interface Window {
  isTimerInitialized?: boolean
  isTaskStoreInitialized?: boolean
  tomatoAPI?: {
    timer: {
      startWorker: (interval: number) => void
      stopWorker: () => void
      onTick: (callback: () => void) => void
      offTick: () => void
    }
    system: {
      showNotification: (
        title: string,
        body: string,
        options?: { urgency: 'low' | 'normal' | 'critical' }
      ) => void
    }
  }
}
