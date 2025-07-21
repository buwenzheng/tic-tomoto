import React, { useMemo } from 'react'
import { useTaskStats } from '@/stores/taskStore'

const StatsPage: React.FC = () => {
  const stats = useTaskStats()
  
  // 计算完成率
  const completionRate = useMemo(() => {
    return stats.total > 0 ? ((stats.completed / stats.total) * 100) : 0
  }, [stats.total, stats.completed])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">统计数据</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">总任务数</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">已完成任务</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.totalPomodoros}</div>
          <div className="stat-label">总番茄数</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{completionRate.toFixed(1)}%</div>
          <div className="stat-label">完成率</div>
        </div>
      </div>

      {/* 统计图表 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">任务状态分布</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500 dark:text-gray-400">
              图表开发中...
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">番茄钟趋势</h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500 dark:text-gray-400">
              图表开发中...
            </div>
          </div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="mt-6 card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">详细统计</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">进行中的任务</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{stats.inProgress}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">待开始的任务</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{stats.pending}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">平均每任务番茄数</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {stats.total > 0 ? (stats.totalPomodoros / stats.total).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPage
