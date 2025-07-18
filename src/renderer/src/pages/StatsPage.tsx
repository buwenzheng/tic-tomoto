import React from 'react'
import { useTaskStats } from '@/stores/taskStore'

const StatsPage: React.FC = () => {
  const stats = useTaskStats()

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
          <div className="stat-number">{stats.completionRate.toFixed(1)}%</div>
          <div className="stat-label">完成率</div>
        </div>
      </div>

      {/* TODO: 添加统计图表 */}
      <div className="mt-8 card p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">更多统计功能开发中...</div>
      </div>
    </div>
  )
}

export default StatsPage
