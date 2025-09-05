import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { TimerMode } from '@/types'
import type { TimerState } from '@/types'
import { storage } from '@/services/storage'
import { DEFAULT_DATA } from '@shared/schema'
import { format } from 'date-fns'
import { getISOWeek } from 'date-fns/getISOWeek'
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
      // 额外：结束时间戳用于漂移修正
      endAt: undefined as unknown as number | undefined,

      start: () => {
        set((draft) => {
          draft.isRunning = true
          draft.isPaused = false
          // 计算结束时间
          const now = Date.now()
          draft.endAt = now + draft.timeLeft * 1000
        })

        // 持久化当前状态
        const state = get()
        storage
          .read()
          .then((data) => {
            storage.write({
              ...data,
              timer: {
                mode: state.mode,
                timeLeft: state.timeLeft,
                totalTime: state.totalTime,
                isRunning: state.isRunning,
                isPaused: state.isPaused,
                endAt: state.endAt
              }
            } as any)
          })
          .catch(() => {})

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.startWorker(1000)
        }
      },

      pause: () => {
        set((draft) => {
          draft.isRunning = false
          draft.isPaused = true
          draft.endAt = undefined
        })

        const state = get()
        storage
          .read()
          .then((data) => {
            storage.write({
              ...data,
              timer: {
                mode: state.mode,
                timeLeft: state.timeLeft,
                totalTime: state.totalTime,
                isRunning: state.isRunning,
                isPaused: state.isPaused,
                endAt: state.endAt
              }
            } as any)
          })
          .catch(() => {})

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
        }
      },

      stop: () => {
        set((draft) => {
          draft.isRunning = false
          draft.isPaused = false
          draft.timeLeft = draft.totalTime
          draft.endAt = undefined
        })

        const state = get()
        storage
          .read()
          .then((data) => {
            storage.write({
              ...data,
              timer: {
                mode: state.mode,
                timeLeft: state.timeLeft,
                totalTime: state.totalTime,
                isRunning: state.isRunning,
                isPaused: state.isPaused,
                endAt: state.endAt
              }
            } as any)
          })
          .catch(() => {})

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
          draft.endAt = undefined
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
          draft.endAt = undefined
        })

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.stopWorker()
          window.tomatoAPI.system.showNotification(
            '番茄时钟',
            `${state.mode === TimerMode.WORK ? '工作' : '休息'}时间结束！`,
            { urgency: 'normal' }
          )
        }

        // 会话完成后的持久化与统计、任务联动
        storage
          .read()
          .then((data) => {
            const now = new Date()
            const dailyKey = format(now, 'yyyy-MM-dd')
            const weekKey = `${format(now, 'yyyy')}-W${String(getISOWeek(now)).padStart(2, '0')}`
            const monthKey = format(now, 'yyyy-MM')

            // 更新统计（仅工作会话计入番茄与工作时长）
            if (state.mode === TimerMode.WORK) {
              data.stats.totalPomodoros = (data.stats.totalPomodoros || 0) + 1
              data.stats.totalWorkTime = (data.stats.totalWorkTime || 0) + state.totalTime
              data.stats.dailyPomodoros[dailyKey] = (data.stats.dailyPomodoros[dailyKey] || 0) + 1
              ;(data.stats.weeklyPomodoros as any)[weekKey] =
                ((data.stats.weeklyPomodoros as any)[weekKey] || 0) + 1
              data.stats.monthlyPomodoros[monthKey] =
                (data.stats.monthlyPomodoros[monthKey] || 0) + 1
            }

            // 任务联动：为当前任务累加番茄数，必要时标记完成
            if (state.currentTaskId) {
              const idx = data.tasks.findIndex((t: any) => t.id === state.currentTaskId)
              if (idx !== -1) {
                const task = data.tasks[idx]
                const updated = {
                  ...task,
                  completedPomodoros:
                    (task.completedPomodoros || 0) + (state.mode === TimerMode.WORK ? 1 : 0),
                  updatedAt: now
                }
                if (
                  state.mode === TimerMode.WORK &&
                  typeof task.estimatedPomodoros === 'number' &&
                  updated.completedPomodoros >= task.estimatedPomodoros
                ) {
                  updated.isCompleted = true
                  updated.completedAt = now
                }
                data.tasks[idx] = updated
              }
            }

            // 更新定时器为下一个阶段
            const next = get()
            const minutesToSeconds = (m: number | undefined) =>
              typeof m === 'number' ? m * 60 : next.totalTime
            let nextMode = next.mode
            let nextTotal = next.totalTime

            if (state.mode === TimerMode.WORK) {
              // 切换到休息
              const interval = (data.settings as any).longBreakInterval || 4
              if ((next.currentSession || 0) % interval === 0) {
                nextMode = TimerMode.LONG_BREAK
                nextTotal = minutesToSeconds((data.settings as any).longBreakDuration)
              } else {
                nextMode = TimerMode.SHORT_BREAK
                nextTotal = minutesToSeconds((data.settings as any).shortBreakDuration)
              }
            } else {
              // 切回工作
              nextMode = TimerMode.WORK
              nextTotal = minutesToSeconds((data.settings as any).workDuration)
            }

            // 更新 store 状态为下一个阶段（不一定自动开始）
            set((draft) => {
              draft.mode = nextMode
              draft.totalTime = nextTotal
              draft.timeLeft = nextTotal
              draft.isRunning = false
              draft.isPaused = false
              draft.endAt = undefined
            })

            // 自动开始逻辑
            const autoStartBreaks = !!(data.settings as any).autoStartBreaks
            const autoStartPomodoros = !!(data.settings as any).autoStartPomodoros
            const shouldAutoStart =
              (state.mode === TimerMode.WORK && autoStartBreaks) ||
              (state.mode !== TimerMode.WORK && autoStartPomodoros)

            if (shouldAutoStart) {
              set((draft) => {
                draft.isRunning = true
                draft.isPaused = false
                draft.endAt = Date.now() + draft.timeLeft * 1000
              })
              if (window.tomatoAPI) {
                window.tomatoAPI.timer.startWorker(1000)
              }
            }

            // 持久化变更
            const persisted = get()
            return storage.write({
              ...data,
              timer: {
                mode: persisted.mode,
                timeLeft: persisted.timeLeft,
                totalTime: persisted.totalTime,
                isRunning: persisted.isRunning,
                isPaused: persisted.isPaused,
                endAt: persisted.endAt
              }
            } as any)
          })
          .catch(() => {})
      },

      initialize: () => {
        // 恢复持久化状态
        storage
          .read()
          .then((data) => {
            const timer = (data?.timer ?? DEFAULT_DATA.timer) as any
            set((draft) => {
              draft.mode = timer.mode as TimerMode
              draft.totalTime =
                typeof timer.totalTime === 'number' ? timer.totalTime : draft.totalTime
              draft.isRunning = !!timer.isRunning
              draft.isPaused = !!timer.isPaused
              draft.endAt = typeof timer.endAt === 'number' ? timer.endAt : undefined
            })

            // 如果存在 endAt，则用漂移修正计算剩余时间
            const current = get()
            if (current.isRunning && current.endAt) {
              const remainingMs = Math.max(0, current.endAt - Date.now())
              set((draft) => {
                draft.timeLeft = Math.ceil(remainingMs / 1000)
              })
            }
          })
          .catch(() => {})

        if (window.tomatoAPI) {
          window.tomatoAPI.timer.onTick(() => {
            const state = get()
            if (state.isRunning && state.timeLeft > 0) {
              let newTimeLeft = state.timeLeft - 1
              // 漂移修正：以 endAt 为准
              if (state.endAt) {
                const remainingMs = Math.max(0, state.endAt - Date.now())
                newTimeLeft = Math.ceil(remainingMs / 1000)
              }

              set((draft) => {
                draft.timeLeft = newTimeLeft
              })

              if (newTimeLeft <= 0) {
                setTimeout(() => {
                  get().completeSession()
                }, 50)
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
  return useTimerStore(useCallback((state) => getProgress(state.timeLeft, state.totalTime), []))
}

export const useFormattedTime = (): string => {
  return useTimerStore(useCallback((state) => formatTime(state.timeLeft), []))
}
