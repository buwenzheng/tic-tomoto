import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { TimerMode } from '@/types'
import type { TimerState } from '@/types'
import { useCallback } from 'react'

// 计时器Store接口
interface TimerStore extends TimerState {
  start: () => void
  pause: () => void
  stop: () => void
  reset: () => void
  setTimeLeft: (timeLeft: number) => void
  setCurrentTask: (taskId?: string) => void
  completeSession: () => void
  initialize: () => void
  cleanup: () => void
}

// 默认时间设置 (秒)
const DEFAULT_TIMES = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
} as const

const getTimeForMode = (mode: TimerMode): number => {
  switch (mode) {
    case TimerMode.WORK:
      return DEFAULT_TIMES.work
    case TimerMode.SHORT_BREAK:
      return DEFAULT_TIMES.shortBreak
    case TimerMode.LONG_BREAK:
      return DEFAULT_TIMES.longBreak
    default:
      return DEFAULT_TIMES.work
  }
}

export const useTimerStore = create<TimerStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      mode: TimerMode.WORK,
      timeLeft: DEFAULT_TIMES.work,
      totalTime: DEFAULT_TIMES.work,
      isRunning: false,
      isPaused: false,
      currentSession: 0,
      totalSessions: 0,
      currentTaskId: undefined,

      start: () => {
        set((draft) => {
          draft.isRunning = true
          draft.isPaused = false
        })

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.startWorker(1000)
        }
      },

      pause: () => {
        set((draft) => {
          draft.isRunning = false
          draft.isPaused = true
        })

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
        }
      },

      stop: () => {
        set((draft) => {
          draft.isRunning = false
          draft.isPaused = false
          draft.timeLeft = draft.totalTime
        })

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
        }
      },

      reset: () => {
        const state = get()
        const newTime = getTimeForMode(state.mode)
        
        set((draft) => {
          draft.isRunning = false
          draft.isPaused = false
          draft.timeLeft = newTime
          draft.totalTime = newTime
        })
      },

      setTimeLeft: (timeLeft: number) => {
        set((draft) => {
          draft.timeLeft = Math.max(0, timeLeft)
        })
      },

      setCurrentTask: (taskId?: string) => {
        set((draft) => {
          draft.currentTaskId = taskId
        })
      },

      completeSession: () => {
        const state = get()
        
        set((draft) => {
          if (draft.mode === TimerMode.WORK) {
            draft.currentSession += 1
            draft.totalSessions += 1
          }
          draft.isRunning = false
          draft.isPaused = false
        })

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
          window.tomatoAPI.system.showNotification(
            '番茄时钟',
            `${state.mode === TimerMode.WORK ? '工作' : '休息'}时间结束！`,
            { urgency: 'normal' }
          )
        }
      },

      initialize: () => {
        if (window.tomatoAPI) {
          window.tomatoAPI.timer.onTick(() => {
            const state = get()
            if (state.isRunning && state.timeLeft > 0) {
              const newTimeLeft = state.timeLeft - 1
              set((draft) => {
                draft.timeLeft = newTimeLeft
              })
              
              // 使用新的时间值检查是否结束
              if (newTimeLeft <= 0) {
                // 延迟执行，避免状态冲突
                setTimeout(() => {
                  get().completeSession()
                }, 100)
              }
            }
          })
        }
      },

      cleanup: () => {
        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
          window.tomatoAPI.timer.offTick()
        }
      }
    }))
  )
)

// 优化的工具函数 - 使用useCallback缓存
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getProgress = (timeLeft: number, totalTime: number): number => {
  if (totalTime === 0) return 0
  return ((totalTime - timeLeft) / totalTime) * 100
}

// 选择器Hook - 避免重复计算
export const useTimerProgress = (): number => {
  return useTimerStore(
    useCallback(
      (state) => getProgress(state.timeLeft, state.totalTime),
      []
    )
  )
}

export const useFormattedTime = (): string => {
  return useTimerStore(
    useCallback(
      (state) => formatTime(state.timeLeft),
      []
    )
  )
} 