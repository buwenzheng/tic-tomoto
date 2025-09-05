import React, { useMemo, useState, useCallback } from 'react'
import { useTaskStats } from '@/stores/taskStore'
import { useStorage } from '@/hooks/useStorage'
import {
  OptimizedPieChart,
  OptimizedLineChart,
  StatCard,
  useStatsData
} from '@/components/StatsCharts'
import { StateManager } from '@/components/LoadingState'
import { SimpleErrorBoundary } from '@/components/ErrorBoundary'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'

const StatsPage: React.FC = () => {
  const stats = useTaskStats()
  const { data, isLoading, error } = useStorage()
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // 使用优化的数据处理 hook
  const { dailyTrend, weeklyTrend, monthlyTrend } = useStatsData(data)

  // 计算完成率（缓存）
  const completionRate = useMemo(() => {
    return stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  }, [stats.total, stats.completed])

  // 状态饼图数据（缓存）
  const statusPie = useMemo(
    () => [
      { name: '已完成', value: stats.completed, color: '#10b981' },
      { name: '进行中', value: stats.inProgress, color: '#3b82f6' },
      { name: '待开始', value: stats.pending, color: '#f59e0b' }
    ],
    [stats.completed, stats.inProgress, stats.pending]
  )

  // 根据时间范围获取趋势数据
  const currentTrendData = useMemo(() => {
    switch (timeRange) {
      case 'weekly':
        return weeklyTrend
      case 'monthly':
        return monthlyTrend
      default:
        return dailyTrend
    }
  }, [timeRange, dailyTrend, weeklyTrend, monthlyTrend])

  // 时间范围切换处理
  const handleTimeRangeChange = useCallback((range: 'daily' | 'weekly' | 'monthly') => {
    setTimeRange(range)
  }, [])

  // 计算趋势（与上周/上月对比）
  const trend = useMemo(() => {
    if (currentTrendData.length < 2) return null

    const current = currentTrendData[currentTrendData.length - 1]?.value || 0
    const previous = currentTrendData[currentTrendData.length - 2]?.value || 0

    if (previous === 0) return null

    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      isPositive: change > 0
    }
  }, [currentTrendData])

  // 获取时间范围标签
  const getTimeRangeLabel = useCallback((range: string) => {
    switch (range) {
      case 'weekly':
        return '近 8 周'
      case 'monthly':
        return '近 6 个月'
      default:
        return '近 14 天'
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">统计数据</h1>

      <StateManager
        loading={isLoading}
        error={error}
        empty={false}
        loadingProps={{
          type: 'skeleton',
          message: '加载统计数据中...'
        }}
        errorProps={{
          title: '数据加载失败',
          onRetry: () => window.location.reload()
        }}
      >
        <SimpleErrorBoundary>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value={stats.total} label="总任务数" trend={trend} />
            <StatCard value={stats.completed} label="已完成任务" />
            <StatCard value={stats.totalPomodoros} label="总番茄数" />
            <StatCard value={`${completionRate.toFixed(1)}%`} label="完成率" />
          </div>

          {/* 时间范围选择器 */}
          <div className="mt-8 flex justify-center">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { key: 'daily', label: '日', icon: Calendar },
                { key: 'weekly', label: '周', icon: TrendingUp },
                { key: 'monthly', label: '月', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleTimeRangeChange(key as 'daily' | 'weekly' | 'monthly')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 统计图表 */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <OptimizedPieChart data={statusPie} title="任务状态分布" />

            <OptimizedLineChart
              data={currentTrendData}
              title={`番茄钟趋势（${getTimeRangeLabel(timeRange)}）`}
              color="#ef4444"
              showDots={currentTrendData.length <= 7}
            />
          </div>

          {/* 详细统计 */}
          <div className="mt-6 card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              详细统计
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">进行中的任务</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.inProgress}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">待开始的任务</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.pending}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">平均每任务番茄数</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.total > 0 ? (stats.totalPomodoros / stats.total).toFixed(1) : '0.0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">当前趋势</span>
                <span
                  className={`font-medium ${trend?.isPositive ? 'text-green-500' : 'text-red-500'}`}
                >
                  {trend
                    ? `${trend.isPositive ? '↗' : '↘'} ${trend.value.toFixed(1)}%`
                    : '暂无数据'}
                </span>
              </div>
            </div>
          </div>
        </SimpleErrorBoundary>
      </StateManager>
    </div>
  )
}

export default StatsPage
