import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { TimerMode } from '@/types'
import { useTimerStore, formatTime, getProgress } from '@/stores/timerStore'
import { useTaskStore } from '@/stores/taskStore'
import clsx from 'clsx'

// 模式颜色常量（避免重复计算）
const MODE_COLORS = {
  stroke: {
    [TimerMode.WORK]: 'stroke-red-500',
    [TimerMode.SHORT_BREAK]: 'stroke-cyan-500',
    [TimerMode.LONG_BREAK]: 'stroke-purple-500'
  },
  bg: {
    [TimerMode.WORK]: 'bg-red-500',
    [TimerMode.SHORT_BREAK]: 'bg-cyan-500',
    [TimerMode.LONG_BREAK]: 'bg-purple-500'
  },
  badge: {
    [TimerMode.WORK]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400',
    [TimerMode.SHORT_BREAK]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-400',
    [TimerMode.LONG_BREAK]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400'
  }
} as const

const MODE_TEXT = {
  [TimerMode.WORK]: '专注工作',
  [TimerMode.SHORT_BREAK]: '短休息',
  [TimerMode.LONG_BREAK]: '长休息'
} as const

// 环形进度条组件
interface CircularProgressProps {
  progress: number
  size: number
  strokeWidth: number
  mode: TimerMode
  isRunning: boolean
}

const CircularProgress = React.memo<CircularProgressProps>(function CircularProgress({
  progress,
  size,
  strokeWidth,
  mode,
  isRunning
}) {
  // 使用 useMemo 缓存计算结果
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth])
  const circumference = useMemo(() => radius * 2 * Math.PI, [radius])
  const strokeDashoffset = useMemo(() => circumference * (1 - progress), [circumference, progress])

  const modeColor = MODE_COLORS.stroke[mode]
  const animationDotColor = MODE_COLORS.bg[mode]

  return (
    <div className="relative">
      {/* 背景圆环 */}
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={clsx(modeColor, 'transition-all duration-300')}
          animate={{ strokeDashoffset }}
        />
      </svg>
      {/* 动画点 */}
      {isRunning && (
        <motion.div
          className={clsx('absolute w-3 h-3 rounded-full', animationDotColor)}
          style={{
            top: strokeWidth / 2,
            left: '50%',
            translateX: '-50%',
            rotate: `${progress * 360}deg`,
            transformOrigin: `50% ${size / 2}px`
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
})

// 主计时器组件
const Timer: React.FC = () => {
  const {
    mode,
    timeLeft,
    totalTime,
    isRunning,
    isPaused,
    currentSession,
    currentTaskId,
    start,
    pause,
    stop,
    reset,
    initialize,
    cleanup
  } = useTimerStore()

  const { getTaskById } = useTaskStore()
  const currentTask = currentTaskId ? getTaskById(currentTaskId) : undefined

  // 使用 ref 来避免重复初始化
  const isInitialized = useRef(false)

  const handlePlayPause = useCallback((): void => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }, [isRunning, pause, start])

  useEffect(() => {
    // 确保全局只初始化一次
    if (!window.isTimerInitialized) {
      initialize()
      window.isTimerInitialized = true
      isInitialized.current = true
    }

    // 注册快捷键事件监听
    const handleToggleTimer = () => {
      handlePlayPause()
    }

    document.addEventListener('toggle-timer', handleToggleTimer)

    // 注册键盘快捷键
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        handlePlayPause()
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      // 只在组件真正卸载时清理
      if (isInitialized.current) {
        cleanup()
        isInitialized.current = false
      }
      document.removeEventListener('toggle-timer', handleToggleTimer)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [initialize, cleanup, handlePlayPause])

  // 使用 useMemo 缓存计算结果，减少重复计算
  const progress = useMemo(() => getProgress(timeLeft, totalTime), [timeLeft, totalTime])
  const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft])

  // 缓存模式相关的样式和文本
  const modeInfo = useMemo(
    () => ({
      text: MODE_TEXT[mode],
      color: MODE_COLORS.badge[mode]
    }),
    [mode]
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
      <div className="relative">
        <CircularProgress
          progress={progress}
          size={320}
          strokeWidth={8}
          mode={mode}
          isRunning={isRunning}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-mono">
            {formattedTime}
          </span>
          <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', modeInfo.color)}>
            {modeInfo.text}
          </span>
          {currentTask && (
            <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              当前任务：{currentTask.title}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 mt-8">
        <button
          onClick={handlePlayPause}
          className={clsx(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isRunning
              ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400'
              : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400'
          )}
          title={isRunning ? '暂停 (空格)' : '开始 (空格)'}
        >
          {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </button>

        <button
          onClick={stop}
          className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 flex items-center justify-center transition-colors"
          title="停止"
          disabled={!isRunning && !isPaused}
        >
          <Square className="w-6 h-6" />
        </button>

        <button
          onClick={reset}
          className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 flex items-center justify-center transition-colors"
          title="重置"
          disabled={!isPaused}
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {currentSession > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          已完成 {currentSession} 个番茄钟
        </div>
      )}
    </div>
  )
}

export default Timer
