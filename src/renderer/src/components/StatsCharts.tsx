import { memo, useMemo } from 'react'
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

// 图表数据接口
interface ChartData {
  date: string
  value: number
}

interface PieData {
  name: string
  value: number
  color: string
}

// 优化的饼图组件
interface PieChartProps {
  data: PieData[]
  title: string
  className?: string
}

export const OptimizedPieChart = memo<PieChartProps>(({ data, title, className }) => {
  // 使用 useMemo 缓存渲染配置
  const chartConfig = useMemo(
    () => ({
      outerRadius: 90,
      label: true,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    }),
    []
  )

  // 缓存颜色映射
  const colorMap = useMemo(
    () =>
      data.reduce(
        (acc, item, idx) => {
          acc[`cell-${idx}`] = item.color
          return acc
        },
        {} as Record<string, string>
      ),
    [data]
  )

  return (
    <div className={`card p-6 ${className || ''}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={chartConfig.outerRadius}
              label={chartConfig.label}
            >
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={colorMap[`cell-${idx}`]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, '数量']}
              labelFormatter={(label: string) => `状态: ${label}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

OptimizedPieChart.displayName = 'OptimizedPieChart'

// 优化的折线图组件
interface LineChartProps {
  data: ChartData[]
  title: string
  className?: string
  color?: string
  showDots?: boolean
}

export const OptimizedLineChart = memo<LineChartProps>(
  ({ data, title, className, color = '#ef4444', showDots = false }) => {
    // 使用 useMemo 缓存图表配置
    const chartConfig = useMemo(
      () => ({
        margin: { top: 5, right: 16, left: 0, bottom: 0 },
        strokeWidth: 2,
        interval: data.length > 7 ? 1 : 0
      }),
      [data.length]
    )

    // 缓存 X 轴配置
    const xAxisConfig = useMemo(
      () => ({
        dataKey: 'date' as const,
        tick: { fontSize: 12 },
        interval: chartConfig.interval
      }),
      [chartConfig.interval]
    )

    // 缓存 Y 轴配置
    const yAxisConfig = useMemo(
      () => ({
        allowDecimals: false,
        tick: { fontSize: 12 }
      }),
      []
    )

    // 缓存折线配置
    const lineConfig = useMemo(
      () => ({
        type: 'monotone' as const,
        dataKey: 'value' as const,
        stroke: color,
        strokeWidth: chartConfig.strokeWidth,
        dot: showDots
      }),
      [color, chartConfig.strokeWidth, showDots]
    )

    return (
      <div className={`card p-6 ${className || ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={chartConfig.margin}>
              <XAxis {...xAxisConfig} />
              <YAxis {...yAxisConfig} />
              <Tooltip
                formatter={(value: number) => [value, '番茄数']}
                labelFormatter={(label: string) => `日期: ${label}`}
              />
              <Line {...lineConfig} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }
)

OptimizedLineChart.displayName = 'OptimizedLineChart'

// 统计卡片组件
interface StatCardProps {
  value: string | number
  label: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export const StatCard = memo<StatCardProps>(({ value, label, trend, className }) => {
  const trendColor = trend ? (trend.isPositive ? 'text-green-500' : 'text-red-500') : ''
  const trendIcon = trend ? (trend.isPositive ? '↗' : '↘') : ''

  return (
    <div className={`stat-card ${className || ''}`}>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className={`text-sm ${trendColor} mt-1`}>
          {trendIcon} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  )
})

StatCard.displayName = 'StatCard'

// 数据处理器 - 将复杂的数据处理逻辑分离
export const useStatsData = (rawData: {
  stats?: {
    dailyPomodoros?: Record<string, number>
    weeklyPomodoros?: Record<string, number>
    monthlyPomodoros?: Record<string, number>
  }
}) => {
  return useMemo(() => {
    // 处理每日趋势数据
    const dailyTrend = Object.entries(rawData.stats?.dailyPomodoros || {})
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-14)
      .map(([date, value]) => ({
        date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        value: value as number
      }))

    // 处理周趋势数据
    const weeklyTrend = Object.entries(rawData.stats?.weeklyPomodoros || {})
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-8)
      .map(([week, value]) => ({
        date: `第${week}周`,
        value: value as number
      }))

    // 处理月趋势数据
    const monthlyTrend = Object.entries(rawData.stats?.monthlyPomodoros || {})
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([month, value]) => ({
        date: month,
        value: value as number
      }))

    return {
      dailyTrend,
      weeklyTrend,
      monthlyTrend
    }
  }, [rawData.stats])
}
