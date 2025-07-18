import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStorage } from '../useStorage'
import { storage, DEFAULT_DATA } from '../../services/storage'
import { Schema } from '../../types'

// Mock storage service
vi.mock('../../services/storage', () => ({
  storage: {
    read: vi.fn(),
    write: vi.fn()
  },
  DEFAULT_DATA: {
    tasks: [],
    timer: {
      mode: 'work',
      timeLeft: 1500,
      totalTime: 1500,
      isRunning: false,
      isPaused: false
    },
    settings: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      longBreakInterval: 4,
      alarmSound: 'bell',
      alarmVolume: 0.8,
      tickingSound: 'none',
      tickingVolume: 0.5,
      darkMode: 'auto',
      minimizeToTray: true
    },
    stats: {
      totalPomodoros: 0,
      totalWorkTime: 0,
      dailyPomodoros: {},
      weeklyPomodoros: {},
      monthlyPomodoros: {}
    },
    version: 1
  }
}))

// 使用 unknown 进行安全类型转换
const mockedRead = (storage.read as unknown) as ReturnType<typeof vi.fn<[], Promise<Schema>>>
const mockedWrite = (storage.write as unknown) as ReturnType<typeof vi.fn<[Schema], Promise<void>>>

describe('useStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRead.mockResolvedValue(DEFAULT_DATA)
    mockedWrite.mockResolvedValue(undefined)
  })

  it('should load data on mount', async () => {
    const { result } = renderHook(() => useStorage())

    expect(result.current.isLoading).toBe(true)
    expect(mockedRead).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.data).toEqual(DEFAULT_DATA)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle save data', async () => {
    const { result } = renderHook(() => useStorage())

    const newData: Schema = {
      ...DEFAULT_DATA,
      settings: {
        ...DEFAULT_DATA.settings,
        workDuration: 30
      }
    }

    await act(async () => {
      await result.current.saveData(newData)
    })

    expect(mockedWrite).toHaveBeenCalledWith(newData)
    expect(result.current.data).toEqual(newData)
    expect(result.current.error).toBeNull()
  })

  it('should handle update data', async () => {
    const { result } = renderHook(() => useStorage())

    const update = {
      settings: {
        ...DEFAULT_DATA.settings,
        workDuration: 35
      }
    }

    await act(async () => {
      await result.current.updateData(update)
    })

    const expectedData = {
      ...DEFAULT_DATA,
      ...update
    }

    expect(mockedWrite).toHaveBeenCalledWith(expectedData)
    expect(result.current.data).toEqual(expectedData)
  })

  it('should handle reset data', async () => {
    const { result } = renderHook(() => useStorage())

    await act(async () => {
      await result.current.resetData()
    })

    expect(mockedWrite).toHaveBeenCalledWith(DEFAULT_DATA)
    expect(result.current.data).toEqual(DEFAULT_DATA)
  })

  it('should handle errors during load', async () => {
    const error = new Error('Failed to load')
    mockedRead.mockRejectedValue(error)

    const { result } = renderHook(() => useStorage())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle errors during save', async () => {
    const error = new Error('Failed to save')
    mockedWrite.mockRejectedValue(error)

    const { result } = renderHook(() => useStorage())

    await act(async () => {
      try {
        await result.current.saveData(DEFAULT_DATA)
      } catch (e) {
        expect(e).toEqual(error)
      }
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.isLoading).toBe(false)
  })
}) 