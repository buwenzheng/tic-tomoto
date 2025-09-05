import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from '../taskStore'
// import { TaskPriority } from '@/types'

vi.mock('@/services/storage', () => {
  const data = {
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

  return {
    storage: {
      read: vi.fn(async () => data),
      write: vi.fn(async (next: any) => {
        Object.assign(data, next)
      })
    }
  }
})

describe('taskStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTaskStore.setState({
      tasks: [],
      loading: false,
      error: null,
      filter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    } as any)
  })

  it('creates and completes a task', async () => {
    const { createTask, completeTask } = useTaskStore.getState()
    await createTask({
      title: 'Test',
      description: '',
      category: '',
      priority: 'medium' as any,
      estimatedPomodoros: 1,
      tags: []
    })
    expect(useTaskStore.getState().tasks.length).toBe(1)
    const id = useTaskStore.getState().tasks[0].id
    await completeTask(id)
    const task = useTaskStore.getState().tasks[0]
    expect(task.isCompleted).toBe(true)
  })

  it('reorders subset without breaking overall order', async () => {
    const { createTask, reorderTasks } = useTaskStore.getState()
    // create three tasks
    await createTask({
      title: 'A',
      description: '',
      category: '',
      priority: 'medium' as any,
      estimatedPomodoros: 1,
      tags: []
    })
    await createTask({
      title: 'B',
      description: '',
      category: '',
      priority: 'medium' as any,
      estimatedPomodoros: 1,
      tags: []
    })
    await createTask({
      title: 'C',
      description: '',
      category: '',
      priority: 'medium' as any,
      estimatedPomodoros: 1,
      tags: []
    })
    const [a, b] = useTaskStore.getState().tasks
    // reorder subset [B, A]
    await reorderTasks([b, a])
    const titles = useTaskStore.getState().tasks.map((t) => t.title)
    expect(titles).toEqual(['B', 'A', 'C'])
  })
})
