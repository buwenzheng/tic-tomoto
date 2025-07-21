import { useMemo } from 'react'

export const usePlatform = () => {
  const isMacOS = useMemo(() => window.tomatoAPI?.platform === 'darwin', [])
  const isWindows = useMemo(() => window.tomatoAPI?.platform === 'win32', [])
  const isLinux = useMemo(() => window.tomatoAPI?.platform === 'linux', [])

  return {
    isMacOS,
    isWindows,
    isLinux,
    platform: window.tomatoAPI?.platform
  }
} 