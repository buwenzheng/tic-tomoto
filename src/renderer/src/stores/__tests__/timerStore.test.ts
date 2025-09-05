import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTimerStore } from '../timerStore'
import { TimerMode } from '@/types'

// Mock storage to avoid real persistence
vi.mock('@/services/storage', () => {
  const data = {
    tasks: [],
    timer: {
      mode: 'work',
      timeLeft: 1500,
      totalTime: 1500,
      isRunning: false,
      isPaused: false,
      endAt: undefined
    },
    settings: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      longBreakInterval: 4,
      alarmSound: 'bell',
      alarmVolume: 0.8,
      tickingSound: 'none',
      tickingVolume: 0.5,
      darkMode: 'auto',
      minimizeToTray: true
    },
    stats: {
      totalPomodoros: 0,
      totalWorkTime: 0,
      dailyPomodoros: {},
      weeklyPomodoros: {},
      monthlyPomodoros: {}
    },
    version: 1
  }

  return {
    storage: {
      read: vi.fn(async () => data),
      write: vi.fn(async (next: any) => {
        Object.assign(data, next)
      })
    }
  }
})

describe('timerStore', () => {
  let tickHandler: (() => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    // Minimal window.tomatoAPI mocks
    ;(global as any).window = (global as any).window || {}
    ;(window as any).tomatoAPI = {
      timer: {
        onTick: (cb: () => void) => {
          tickHandler = cb
        },
        offTick: () => {
          tickHandler = null
        },
        startWorker: vi.fn(),
        stopWorker: vi.fn()
      },
      system: {
        showNotification: vi.fn()
      }
    }

    // reset store to default
    useTimerStore.setState({
      mode: TimerMode.WORK,
      timeLeft: 2,
      totalTime: 2,
      isRunning: false,
      isPaused: false,
      currentSession: 0,
      totalSessions: 0,
      currentTaskId: undefined,
      endAt: undefined
    } as any)
  })

  it('should start and tick down to completion', async () => {
    const { initialize, start } = useTimerStore.getState()
    initialize()
    start()

    expect(tickHandler).toBeTruthy()
    // simulate two ticks
    tickHandler && tickHandler()
    expect(useTimerStore.getState().timeLeft).toBe(1)
    tickHandler && tickHandler()

    // allow completeSession to schedule
    await new Promise((r) => setTimeout(r, 80))

    const state = useTimerStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.timeLeft).toBeGreaterThanOrEqual(0)
  })
})
