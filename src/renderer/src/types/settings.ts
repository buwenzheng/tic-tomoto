// 设置领域类型

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

export interface TimerSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  tickSound: boolean
  notificationSound: boolean
  strictMode: boolean
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

export interface AppSettings {
  timer: TimerSettings
  general: GeneralSettings
  appearance: AppearanceSettings
  notifications: NotificationSettings
  advanced: AdvancedSettings
}
