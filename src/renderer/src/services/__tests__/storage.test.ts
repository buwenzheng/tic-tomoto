import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalStorageAdapter, DEFAULT_DATA } from '../storage'
import { ThemeMode } from '../../types'

describe('LocalStorageAdapter', () => {
  let storage: LocalStorageAdapter
  let mockLocalStorage: { [key: string]: string }

  beforeEach(() => {
    mockLocalStorage = {}

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockLocalStorage[key] = value.toString()
      }),
      removeItem: vi.fn((key) => {
        delete mockLocalStorage[key]
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {}
      }),
      key: vi.fn((index) => Object.keys(mockLocalStorage)[index] || null),
      length: Object.keys(mockLocalStorage).length
    }

    storage = new LocalStorageAdapter('test-storage')
  })

  it('should return default data when storage is empty', async () => {
    const data = await storage.read()
    expect(data).toEqual(DEFAULT_DATA)
  })

  it('should write and read data correctly', async () => {
    const testData = {
      ...DEFAULT_DATA,
      settings: {
        ...DEFAULT_DATA.settings,
        darkMode: ThemeMode.DARK
      }
    }

    await storage.write(testData)
    const readData = await storage.read()
    expect(readData).toEqual(testData)
  })

  it('should migrate old data format', async () => {
    const oldData = {
      tasks: [
        {
          id: '1',
          title: 'Test Task',
          priority: 'high',
          estimatedPomodoros: 4,
          completedPomodoros: 0,
          isCompleted: false
        }
      ],
      settings: {
        workDuration: 30
      }
    }

    mockLocalStorage['test-storage'] = JSON.stringify(oldData)
    const data = await storage.read()

    expect(data.version).toBe(1)
    expect(data.tasks[0]).toHaveProperty('createdAt')
    expect(data.tasks[0]).toHaveProperty('updatedAt')
    expect(data.settings.workDuration).toBe(30)
  })

  it('should handle invalid JSON data', async () => {
    mockLocalStorage['test-storage'] = 'invalid-json'
    const data = await storage.read()
    expect(data).toEqual(DEFAULT_DATA)
  })

  it('should handle storage errors', async () => {
    // Mock localStorage.setItem to throw an error
    global.localStorage.setItem = vi.fn(() => {
      throw new Error('Storage full')
    })

    const testData = { ...DEFAULT_DATA }
    await expect(storage.write(testData)).rejects.toThrow('Storage full')
  })
})
