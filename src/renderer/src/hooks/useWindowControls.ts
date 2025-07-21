import { useCallback } from 'react'

export const useWindowControls = () => {
  const handleMinimize = useCallback((): void => {
    if (window.tomatoAPI?.window?.minimize) {
      window.tomatoAPI.window.minimize()
    }
  }, [])

  const handleMaximize = useCallback(async (): Promise<void> => {
    const win = window.tomatoAPI?.window
    if (win?.isMaximized && win?.maximize && win?.unmaximize) {
      try {
        const isMaximized = await win.isMaximized()
        if (isMaximized) {
          win.unmaximize()
        } else {
          win.maximize()
        }
      } catch (error) {
        console.error('Failed to toggle maximize:', error)
      }
    }
  }, [])

  const handleClose = useCallback((): void => {
    if (window.tomatoAPI?.window?.close) {
      window.tomatoAPI.window.close()
    }
  }, [])

  return {
    handleMinimize,
    handleMaximize,
    handleClose
  }
} 