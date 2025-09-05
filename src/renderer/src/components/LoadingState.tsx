import React from 'react'
import { Loader2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import clsx from 'clsx'

// 加载状态类型
export type LoadingType = 'default' | 'minimal' | 'inline' | 'skeleton'

// 加载状态组件属性
interface LoadingStateProps {
  type?: LoadingType
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// 错误状态组件属性
interface ErrorStateProps {
  title?: string
  message?: string
  type?: 'network' | 'storage' | 'validation' | 'unknown'
  showRetry?: boolean
  onRetry?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// 空状态组件属性
interface EmptyStateProps {
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}

// 加载状态组件
export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'default',
  message = '加载中...',
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  if (type === 'minimal') {
    return (
      <div className={clsx('flex items-center gap-2', sizeClasses[size], className)}>
        <Loader2 className={clsx('animate-spin text-primary-500', iconSizes[size])} />
        <span className="text-gray-600 dark:text-gray-400">{message}</span>
      </div>
    )
  }

  if (type === 'inline') {
    return (
      <div
        className={clsx(
          'flex items-center justify-center gap-2 py-4',
          sizeClasses[size],
          className
        )}
      >
        <Loader2 className={clsx('animate-spin text-primary-500', iconSizes[size])} />
        <span className="text-gray-600 dark:text-gray-400">{message}</span>
      </div>
    )
  }

  if (type === 'skeleton') {
    return (
      <div className={clsx('space-y-3', className)}>
        <div className="shimmer w-full h-4 rounded"></div>
        <div className="shimmer w-3/4 h-4 rounded"></div>
        <div className="shimmer w-1/2 h-4 rounded"></div>
      </div>
    )
  }

  // 默认全屏加载
  return (
    <div className={clsx('flex flex-col items-center justify-center min-h-32 py-8', className)}>
      <div className="mb-4">
        <Loader2 className={clsx('animate-spin text-primary-500', iconSizes[size])} />
      </div>
      <p className={clsx('text-gray-600 dark:text-gray-400', sizeClasses[size])}>{message}</p>
    </div>
  )
}

// 错误状态组件
export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  type = 'unknown',
  showRetry = true,
  onRetry,
  className,
  size = 'md'
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: (
            <WifiOff
              className={clsx(
                'text-red-500',
                size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
              )}
            />
          ),
          defaultTitle: '网络连接错误',
          defaultMessage: '请检查网络连接后重试'
        }
      case 'storage':
        return {
          icon: (
            <AlertCircle
              className={clsx(
                'text-orange-500',
                size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
              )}
            />
          ),
          defaultTitle: '数据存储错误',
          defaultMessage: '数据读写失败，请重试'
        }
      case 'validation':
        return {
          icon: (
            <AlertCircle
              className={clsx(
                'text-yellow-500',
                size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
              )}
            />
          ),
          defaultTitle: '数据验证错误',
          defaultMessage: '提交的数据格式不正确'
        }
      default:
        return {
          icon: (
            <AlertCircle
              className={clsx(
                'text-red-500',
                size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
              )}
            />
          ),
          defaultTitle: '操作失败',
          defaultMessage: '遇到了意外错误，请稍后重试'
        }
    }
  }

  const config = getErrorConfig()
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center py-8 text-center', className)}>
      <div className="mb-4">{config.icon}</div>
      <h3
        className={clsx('font-semibold text-gray-900 dark:text-gray-100 mb-2', sizeClasses[size])}
      >
        {title || config.defaultTitle}
      </h3>
      <p
        className={clsx(
          'text-gray-600 dark:text-gray-400 mb-4 max-w-sm',
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
        )}
      >
        {message || config.defaultMessage}
      </p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className={clsx(
            'btn-primary flex items-center gap-2',
            size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3' : 'px-4 py-2'
          )}
        >
          <RefreshCw className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
          重试
        </button>
      )}
    </div>
  )
}

// 空状态组件
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  message = '还没有任何内容',
  action,
  icon,
  className
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4">
        {icon || (
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-2xl text-gray-400">📝</span>
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">{message}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  )
}

// 综合状态组件（根据状态自动切换）
interface StateManagerProps {
  loading: boolean
  error: string | Error | null
  empty: boolean
  children: React.ReactNode
  loadingProps?: LoadingStateProps
  errorProps?: Omit<ErrorStateProps, 'message' | 'onRetry'> & { onRetry?: () => void }
  emptyProps?: EmptyStateProps
}

export const StateManager: React.FC<StateManagerProps> = ({
  loading,
  error,
  empty,
  children,
  loadingProps,
  errorProps,
  emptyProps
}) => {
  if (loading) {
    return <LoadingState {...loadingProps} />
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : error
    const errorType = errorMessage.toLowerCase().includes('network')
      ? 'network'
      : errorMessage.toLowerCase().includes('storage')
        ? 'storage'
        : errorMessage.toLowerCase().includes('validation')
          ? 'validation'
          : 'unknown'

    return <ErrorState {...errorProps} message={errorMessage} type={errorType} />
  }

  if (empty) {
    return <EmptyState {...emptyProps} />
  }

  return <>{children}</>
}
