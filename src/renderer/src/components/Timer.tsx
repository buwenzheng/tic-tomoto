import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { TimerMode } from '@/types'
import { useTimerStore, formatTime, getProgress } from '@/stores/timerStore'
import clsx from 'clsx'

// 环形进度条组件
interface CircularProgressProps {
  progress: number
  size: number
  strokeWidth: number
  mode: TimerMode
  isRunning: boolean
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth,
  mode,
  isRunning
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const strokeColor = mode === TimerMode.WORK ? '#ef4444' : 
                     mode === TimerMode.SHORT_BREAK ? '#06b6d4' : '#8b5cf6'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ strokeDashoffset }}
          transition={{ duration: isRunning ? 1 : 0.5, ease: "linear" }}
        />
      </svg>
    </div>
  )
}

// 控制按钮组件
interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  children
}) => {
  const buttonClass = clsx(
    'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'bg-primary-500 text-white hover:bg-primary-600': variant === 'primary',
      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300': variant === 'secondary',
      'bg-red-100 text-red-700 hover:bg-red-200': variant === 'danger',
      'w-8 h-8 text-sm': size === 'sm',
      'w-12 h-12 text-base': size === 'md',
      'w-16 h-16 text-lg': size === 'lg'
    }
  )

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
    >
      {children}
    </motion.button>
  )
}

// 主计时器组件
const Timer: React.FC = () => {
  const {
    mode,
    timeLeft,
    totalTime,
    isRunning,
    isPaused,
    currentSession,
    start,
    pause,
    stop,
    reset,
    initialize,
    cleanup
  } = useTimerStore()

  // 使用 ref 来避免重复初始化
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isInitialized.current) {
      initialize()
      isInitialized.current = true
    }

    return () => {
      cleanup()
    }
  }, []) // 空依赖数组，只在组件挂载时执行一次

  const progress = getProgress(timeLeft, totalTime)
  const formattedTime = formatTime(timeLeft)

  const modeText = mode === TimerMode.WORK ? '专注工作' : 
                   mode === TimerMode.SHORT_BREAK ? '短休息' : '长休息'

  const modeColor = mode === TimerMode.WORK ? 'bg-red-100 text-red-800' :
                    mode === TimerMode.SHORT_BREAK ? 'bg-cyan-100 text-cyan-800' : 
                    'bg-purple-100 text-purple-800'

  const handlePlayPause = (): void => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }

  return (
    <div className="flex flex-col items-center space-y-8 p-8">
      {/* 模式指示器 */}
      <span className={clsx('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', modeColor)}>
        {modeText}
      </span>

      {/* 环形计时器 */}
      <div className="relative flex items-center justify-center">
        <CircularProgress
          progress={progress}
          size={280}
          strokeWidth={8}
          mode={mode}
          isRunning={isRunning}
        />
        
        {/* 中心内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-mono font-bold text-gray-900 dark:text-gray-100">
            {formattedTime}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            第 {currentSession} 个番茄
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center space-x-4">
        <ControlButton
          onClick={handlePlayPause}
          variant="primary"
          size="lg"
          disabled={timeLeft === 0}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </ControlButton>
        
        <ControlButton
          onClick={stop}
          variant="danger"
          disabled={!isRunning && !isPaused}
        >
          <Square size={20} />
        </ControlButton>
        
        <ControlButton
          onClick={reset}
          disabled={isRunning}
        >
          <RotateCcw size={20} />
        </ControlButton>
      </div>

      {/* 快捷操作提示 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
        <p>空格键：开始/暂停 • R 键：重置 • S 键：停止</p>
      </div>
    </div>
  )
}

export default Timer 