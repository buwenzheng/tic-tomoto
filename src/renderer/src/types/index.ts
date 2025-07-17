// ===============================
// 任务相关类型
// ===============================

export interface Task {
  id: string
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  completedPomodoros: number
  isCompleted: boolean
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  tags?: string[]
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'paused'

export interface TaskFormData {
  title: string
  description?: string
  category?: string
  priority: TaskPriority
  estimatedPomodoros: number
  tags?: string[]
}

// ===============================
// 计时器相关类型
// ===============================

export interface TimerState {
  mode: TimerMode
  timeLeft: number
  totalTime: number
  isRunning: boolean
  isPaused: boolean
  currentSession: number
  totalSessions: number
  currentTaskId?: string
}

export enum TimerMode {
  WORK = 'work',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break'
}

export interface TimerSettings {
  workDuration: number      // 工作时长 (分钟)
  shortBreakDuration: number // 短休息时长 (分钟)
  longBreakDuration: number  // 长休息时长 (分钟)
  longBreakInterval: number  // 长休息间隔 (几个番茄后)
  autoStartBreaks: boolean   // 自动开始休息
  autoStartWork: boolean     // 自动开始工作
  tickSound: boolean         // 滴答声
  notificationSound: boolean // 通知声音
  strictMode: boolean        // 严格模式
}

// ===============================
// 设置相关类型
// ===============================

export interface AppSettings {
  timer: TimerSettings
  general: GeneralSettings
  appearance: AppearanceSettings
  notifications: NotificationSettings
  advanced: AdvancedSettings
}

export interface GeneralSettings {
  language: string
  startMinimized: boolean
  minimizeToTray: boolean
  launchOnStartup: boolean
  enableShortcuts: boolean
}

export interface AppearanceSettings {
  theme: ThemeMode
  primaryColor: string
  fontSize: FontSize
  compactMode: boolean
  showTaskProgress: boolean
  showSessionCounter: boolean
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface NotificationSettings {
  enabled: boolean
  sound: boolean
  desktop: boolean
  taskCompleted: boolean
  sessionCompleted: boolean
  breakReminder: boolean
  soundVolume: number
}

export interface AdvancedSettings {
  dataBackup: boolean
  analyticsEnabled: boolean
  experimentalFeatures: boolean
  developerMode: boolean
}

// ===============================
// 统计相关类型
// ===============================

export interface Statistics {
  daily: DailyStats[]
  weekly: WeeklyStats[]
  monthly: MonthlyStats[]
  overview: OverviewStats
}

export interface DailyStats {
  date: string
  completedPomodoros: number
  completedTasks: number
  totalFocusTime: number // 秒
  totalBreakTime: number // 秒
  productivity: number   // 0-100
  tags: TagStats[]
}

export interface WeeklyStats {
  week: string // ISO week format
  year: number
  completedPomodoros: number
  completedTasks: number
  totalFocusTime: number
  averageDailyPomodoros: number
  productivity: number
  consistencyScore: number // 连续性评分
}

export interface MonthlyStats {
  month: number
  year: number
  completedPomodoros: number
  completedTasks: number
  totalFocusTime: number
  averageDailyPomodoros: number
  productivity: number
  bestStreak: number // 最长连续天数
}

export interface OverviewStats {
  totalPomodoros: number
  totalTasks: number
  totalFocusTime: number
  currentStreak: number
  longestStreak: number
  averageSessionLength: number
  mostProductiveHour: number
  favoriteCategory: string
}

export interface TagStats {
  tag: string
  count: number
  focusTime: number
}

// ===============================
// 存储相关类型
// ===============================

export interface StorageAdapter {
  tasks: TaskRepository
  stats: StatsRepository
  settings: SettingsRepository
}

export interface TaskRepository {
  getAll(): Promise<Task[]>
  getById(id: string): Promise<Task | null>
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>
  update(id: string, updates: Partial<Task>): Promise<Task>
  delete(id: string): Promise<void>
  getByCategory(category: string): Promise<Task[]>
  getByStatus(status: TaskStatus): Promise<Task[]>
}

export interface StatsRepository {
  getDailyStats(date: string): Promise<DailyStats | null>
  getWeeklyStats(week: string, year: number): Promise<WeeklyStats | null>
  getMonthlyStats(month: number, year: number): Promise<MonthlyStats | null>
  getOverviewStats(): Promise<OverviewStats>
  addPomodoroSession(taskId: string, duration: number, mode: TimerMode): Promise<void>
  updateDailyStats(date: string, updates: Partial<DailyStats>): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<AppSettings>
  update(updates: Partial<AppSettings>): Promise<AppSettings>
  reset(): Promise<AppSettings>
}

// ===============================
// API相关类型 (未来云端同步)
// ===============================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  createdAt: Date
  subscription?: SubscriptionInfo
}

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'team'
  expiresAt?: Date
  features: string[]
}

export interface SyncData {
  tasks: Task[]
  settings: AppSettings
  stats: Statistics
  lastSyncAt: Date
}

// ===============================
// UI组件相关类型
// ===============================

export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ModalProps extends ComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

export interface FormFieldProps extends ComponentProps {
  label?: string
  error?: string
  required?: boolean
}

// ===============================
// 错误类型
// ===============================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export enum ErrorCode {
  STORAGE_ERROR = 'STORAGE_ERROR',
  TIMER_ERROR = 'TIMER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR'
}

// ===============================
// 事件类型
// ===============================

export interface AppEvent {
  type: string
  payload?: Record<string, unknown>
  timestamp: number
}

export interface TimerEvent extends AppEvent {
  type: 'timer:start' | 'timer:pause' | 'timer:stop' | 'timer:complete' | 'timer:mode-change'
  payload: {
    mode: TimerMode
    timeLeft: number
    currentSession: number
  }
}

export interface TaskEvent extends AppEvent {
  type: 'task:created' | 'task:updated' | 'task:completed' | 'task:deleted'
  payload: {
    task: Task
  }
}

// ===============================
// 工具类型
// ===============================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
} 