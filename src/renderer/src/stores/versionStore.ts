import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface VersionStore {
  // 状态
  appVersion: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
  isLoading: boolean

  // 操作
  initializeVersions: () => Promise<void>
}

export const useVersionStore = create<VersionStore>()(
  immer((set) => ({
    // 初始状态
    appVersion: '0.1.0',
    electronVersion: '-',
    chromeVersion: '-',
    nodeVersion: '-',
    isLoading: true,

    // 初始化版本信息
    initializeVersions: async () => {
      const versions = window.tomatoAPI?.versions
      if (!versions) return

      try {
        const appVersion = await versions.app
        
        set((state) => {
          state.appVersion = appVersion
          state.electronVersion = versions.electron || '-'
          state.chromeVersion = versions.chrome || '-'
          state.nodeVersion = versions.node || '-'
          state.isLoading = false
        })
      } catch (error) {
        console.error('Failed to initialize versions:', error)
        set((state) => {
          state.isLoading = false
        })
      }
    }
  }))
) 