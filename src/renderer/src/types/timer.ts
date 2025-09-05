// 计时器领域类型

export enum TimerMode {
  WORK = 'work',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break'
}

export interface TimerState {
  mode: TimerMode
  timeLeft: number
  totalTime: number
  isRunning: boolean
  isPaused: boolean
  currentSession: number
  totalSessions: number
  currentTaskId?: string
  endAt?: number
}
