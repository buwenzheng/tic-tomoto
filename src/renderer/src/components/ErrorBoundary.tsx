import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  showReportButton?: boolean
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 你同样可以将错误日志上报给服务器
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })

    // 如果有全局错误报告API，可以在这里调用
    if (window.tomatoAPI?.system?.reportError) {
      window.tomatoAPI.system.reportError({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // 导航到首页
    window.location.hash = '#/timer'
  }

  handleReportBug = (): void => {
    const { error, errorInfo } = this.state

    // 构造错误报告内容
    const reportContent = `
**错误详情:**
- 时间: ${new Date().toLocaleString()}
- 错误: ${error?.name || 'Unknown'}: ${error?.message || '未知错误'}
- 页面: ${window.location.hash}

**错误堆栈:**
\`\`\`
${error?.stack || '无堆栈信息'}
\`\`\`

**组件堆栈:**
\`\`\`
${errorInfo?.componentStack || '无组件堆栈'}
\`\`\`

**用户代理:**
${navigator.userAgent}
    `.trim()

    // 复制到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportContent).then(() => {
        // 可以显示一个提示
        console.log('错误报告已复制到剪贴板')
      })
    }

    // 打开GitHub Issues页面（如果有的话）
    if (window.tomatoAPI?.shell?.openExternal) {
      window.tomatoAPI.shell.openExternal('https://github.com/your-repo/issues/new')
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const {
        fallbackTitle = '页面出现错误',
        fallbackMessage = '很抱歉，页面遇到了意外错误。您可以尝试刷新页面或返回首页。',
        showReportButton = true
      } = this.props

      const { error } = this.state

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {fallbackTitle}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{fallbackMessage}</p>
                {error && (
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      查看错误详情
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
                      {error.toString()}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="btn-primary flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="btn-secondary flex items-center justify-center"
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </button>
                {showReportButton && (
                  <button
                    onClick={this.handleReportBug}
                    className="btn-outline flex items-center justify-center text-sm"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    报告问题
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 轻量级错误边界，用于局部组件
export const SimpleErrorBoundary: React.FC<{
  children: ReactNode
  fallback?: ReactNode
}> = ({ children }) => {
  return (
    <ErrorBoundary
      fallbackTitle="组件加载失败"
      fallbackMessage="此组件遇到了错误，请尝试刷新。"
      showReportButton={false}
    >
      {children}
    </ErrorBoundary>
  )
}
