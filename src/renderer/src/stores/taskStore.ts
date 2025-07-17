import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { TaskPriority } from '@/types'
import type { Task, TaskFormData } from '@/types'
import { StorageFactory } from '@/services/storage'
import { useMemo } from 'react'

// 任务Store接口
interface TaskStore {
  // 状态
  tasks: Task[]
  loading: boolean
  error: string | null
  
  // 过滤和排序
  filter: 'all' | 'pending' | 'in-progress' | 'completed'
  sortBy: 'createdAt' | 'priority' | 'completedPomodoros'
  sortOrder: 'asc' | 'desc'
  
  // 操作
  loadTasks: () => Promise<void>
  createTask: (taskData: TaskFormData) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  addPomodoroToTask: (id: string) => Promise<void>
  
  // 过滤和排序
  setFilter: (filter: 'all' | 'pending' | 'in-progress' | 'completed') => void
  setSortBy: (sortBy: 'createdAt' | 'priority' | 'completedPomodoros') => void
  setSortOrder: (sortOrder: 'asc' | 'desc') => void
  
  // 选择器
  getTaskById: (id: string) => Task | undefined
  getTasksByCategory: (category: string) => Task[]
  getActiveTask: () => Task | undefined
  
  // 批量操作
  deleteCompletedTasks: () => Promise<void>
  markAllAsCompleted: () => Promise<void>
  
  // 初始化
  initialize: () => Promise<void>
}

// 任务优先级权重 (用于排序)
const PRIORITY_WEIGHTS = {
  [TaskPriority.LOW]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.URGENT]: 4
}

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      tasks: [],
      loading: false,
      error: null,
      filter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',

      // 加载任务
      loadTasks: async () => {
        set((draft) => {
          draft.loading = true
          draft.error = null
        })

        try {
          const storage = StorageFactory.getAdapter()
          const tasks = await storage.tasks.getAll()
          
          set((draft) => {
            draft.tasks = tasks
            draft.loading = false
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '加载任务失败'
            draft.loading = false
          })
        }
      },

      // 创建任务
      createTask: async (taskData: TaskFormData) => {
        set((draft) => {
          draft.loading = true
          draft.error = null
        })

        try {
          const storage = StorageFactory.getAdapter()
          const newTask = await storage.tasks.create({
            ...taskData,
            completedPomodoros: 0,
            isCompleted: false
          })
          
          set((draft) => {
            draft.tasks.unshift(newTask)
            draft.loading = false
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '创建任务失败'
            draft.loading = false
          })
        }
      },

      // 更新任务
      updateTask: async (id: string, updates: Partial<Task>) => {
        try {
          const storage = StorageFactory.getAdapter()
          const updatedTask = await storage.tasks.update(id, updates)
          
          set((draft) => {
            const index = draft.tasks.findIndex(task => task.id === id)
            if (index !== -1) {
              draft.tasks[index] = updatedTask
            }
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '更新任务失败'
          })
        }
      },

      // 删除任务
      deleteTask: async (id: string) => {
        try {
          const storage = StorageFactory.getAdapter()
          await storage.tasks.delete(id)
          
          set((draft) => {
            draft.tasks = draft.tasks.filter(task => task.id !== id)
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '删除任务失败'
          })
        }
      },

      // 完成任务
      completeTask: async (id: string) => {
        try {
          const storage = StorageFactory.getAdapter()
          const updatedTask = await storage.tasks.update(id, {
            isCompleted: true,
            completedAt: new Date()
          })
          
          set((draft) => {
            const index = draft.tasks.findIndex(task => task.id === id)
            if (index !== -1) {
              draft.tasks[index] = updatedTask
            }
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '完成任务失败'
          })
        }
      },

      // 为任务添加番茄数
      addPomodoroToTask: async (id: string) => {
        try {
          const task = get().getTaskById(id)
          if (!task) return

          const storage = StorageFactory.getAdapter()
          const updatedTask = await storage.tasks.update(id, {
            completedPomodoros: task.completedPomodoros + 1
          })
          
          set((draft) => {
            const index = draft.tasks.findIndex(task => task.id === id)
            if (index !== -1) {
              draft.tasks[index] = updatedTask
            }
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '更新任务失败'
          })
        }
      },

      // 过滤和排序
      setFilter: (filter) => {
        set((draft) => {
          draft.filter = filter
        })
      },

      setSortBy: (sortBy) => {
        set((draft) => {
          draft.sortBy = sortBy
        })
      },

      setSortOrder: (sortOrder) => {
        set((draft) => {
          draft.sortOrder = sortOrder
        })
      },

      // 选择器
      getTaskById: (id: string) => {
        return get().tasks.find(task => task.id === id)
      },

      getTasksByCategory: (category: string) => {
        return get().tasks.filter(task => task.category === category)
      },

      getActiveTask: () => {
        return get().tasks.find(task => !task.isCompleted && task.completedPomodoros > 0)
      },

      // 批量操作
      deleteCompletedTasks: async () => {
        const completedTasks = get().tasks.filter(task => task.isCompleted)
        
        try {
          const storage = StorageFactory.getAdapter()
          await Promise.all(
            completedTasks.map(task => storage.tasks.delete(task.id))
          )
          
          set((draft) => {
            draft.tasks = draft.tasks.filter(task => !task.isCompleted)
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '删除已完成任务失败'
          })
        }
      },

      markAllAsCompleted: async () => {
        const incompleteTasks = get().tasks.filter(task => !task.isCompleted)
        
        try {
          const storage = StorageFactory.getAdapter()
          await Promise.all(
            incompleteTasks.map(task => 
              storage.tasks.update(task.id, {
                isCompleted: true,
                completedAt: new Date()
              })
            )
          )
          
          set((draft) => {
            draft.tasks.forEach(task => {
              if (!task.isCompleted) {
                task.isCompleted = true
                task.completedAt = new Date()
              }
            })
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '标记所有任务为已完成失败'
          })
        }
      },

      // 初始化
      initialize: async () => {
        await get().loadTasks()
      }
    }))
  )
)

// 优化的选择器 - 使用useMemo缓存结果
export const useFilteredTasks = (): Task[] => {
  const { tasks, filter, sortBy, sortOrder } = useTaskStore((state) => ({
    tasks: state.tasks,
    filter: state.filter,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder
  }))

  return useMemo(() => {
    let filteredTasks = [...tasks]

    // 应用过滤器
    if (filter !== 'all') {
      filteredTasks = filteredTasks.filter(task => {
        switch (filter) {
          case 'completed':
            return task.isCompleted
          case 'in-progress':
            return !task.isCompleted && task.completedPomodoros > 0
          case 'pending':
            return !task.isCompleted && task.completedPomodoros === 0
          default:
            return true
        }
      })
    }

    // 应用排序
    filteredTasks.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'priority':
          comparison = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]
          break
        case 'completedPomodoros':
          comparison = a.completedPomodoros - b.completedPomodoros
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filteredTasks
  }, [tasks, filter, sortBy, sortOrder])
}

export const useTaskStats = (): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  totalPomodoros: number;
  completionRate: number;
} => {
  const tasks = useTaskStore((state) => state.tasks)

  return useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(task => task.isCompleted).length
    const inProgress = tasks.filter(task => !task.isCompleted && task.completedPomodoros > 0).length
    const pending = tasks.filter(task => !task.isCompleted && task.completedPomodoros === 0).length
    const totalPomodoros = tasks.reduce((sum, task) => sum + task.completedPomodoros, 0)

    return {
      total,
      completed,
      inProgress,
      pending,
      totalPomodoros,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    }
  }, [tasks])
} 