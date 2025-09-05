import React, { useMemo } from 'react'
import { useTaskStats } from '@/stores/taskStore'
import { useStorage } from '@/hooks/useStorage'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

const StatsPage: React.FC = () => {
  const stats = useTaskStats()

  // 计算完成率
  const completionRate = useMemo(() => {
    return stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  }, [stats.total, stats.completed])

  const { data } = useStorage()
  const dailyTrend = useMemo(() => {
    const entries = Object.entries(data.stats?.dailyPomodoros || {})
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-14)
    return entries.map(([date, value]) => ({ date, value }))
  }, [data.stats])

  const statusPie = useMemo(
    () => [
      { name: '已完成', value: stats.completed, color: '#10b981' },
      { name: '进行中', value: stats.inProgress, color: '#3b82f6' },
      { name: '待开始', value: stats.pending, color: '#f59e0b' }
    ],
    [stats.completed, stats.inProgress, stats.pending]
  )

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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            任务状态分布
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            番茄钟趋势（近 14 天）
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval={dailyTrend.length > 7 ? 1 : 0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
