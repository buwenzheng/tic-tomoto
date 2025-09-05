import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { TaskPriority } from '@/types'
import type { Task, TaskFormData } from '@/types'
import { storage } from '@/services/storage'
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
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<Task | undefined>
  addPomodoroToTask: (id: string) => Promise<Task | undefined>
  reorderTasks: (tasks: Task[]) => Promise<void>

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
          const data = await storage.read()

          set((draft) => {
            draft.tasks = data.tasks
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
          const data = await storage.read()
          const newTask: Task = {
            id: crypto.randomUUID(),
            ...taskData,
            completedPomodoros: 0,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          data.tasks.push(newTask)
          await storage.write(data)

          set((draft) => {
            draft.tasks.push(newTask)
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
          const data = await storage.read()
          const taskIndex = data.tasks.findIndex((task) => task.id === id)

          if (taskIndex === -1) {
            throw new Error(`任务 ${id} 不存在`)
          }

          const updatedTask = {
            ...data.tasks[taskIndex],
            ...updates,
            updatedAt: new Date()
          }

          data.tasks[taskIndex] = updatedTask
          await storage.write(data)

          set((draft) => {
            const index = draft.tasks.findIndex((task) => task.id === id)
            if (index !== -1) {
              draft.tasks[index] = updatedTask
            }
          })

          return updatedTask
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '更新任务失败'
          })
          throw error
        }
      },

      // 删除任务
      deleteTask: async (id: string) => {
        try {
          const data = await storage.read()
          data.tasks = data.tasks.filter((task) => task.id !== id)
          await storage.write(data)

          set((draft) => {
            draft.tasks = draft.tasks.filter((task) => task.id !== id)
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '删除任务失败'
          })
          throw error
        }
      },

      // 完成任务
      completeTask: async (id: string) => {
        try {
          const task = get().getTaskById(id)
          if (!task) throw new Error(`任务 ${id} 不存在`)

          const updatedTask = await get().updateTask(id, {
            isCompleted: !task.isCompleted,
            completedAt: !task.isCompleted ? new Date() : undefined
          })

          return updatedTask
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '更新任务失败'
          })
          throw error
        }
      },

      // 为任务添加番茄数
      addPomodoroToTask: async (id: string) => {
        try {
          const task = get().getTaskById(id)
          if (!task) throw new Error(`任务 ${id} 不存在`)

          const updatedTask = await get().updateTask(id, {
            completedPomodoros: task.completedPomodoros + 1
          })

          return updatedTask
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '更新任务失败'
          })
          throw error
        }
      },

      // 重排序任务（支持部分列表重排：例如当前过滤视图）
      reorderTasks: async (subsetNewOrder: Task[]) => {
        try {
          const data = await storage.read()
          const original = data.tasks as Task[]
          const subsetIdToOrder = new Map<string, number>()
          subsetNewOrder.forEach((t, i) => subsetIdToOrder.set(t.id, i))

          const originalIndex = new Map<string, number>()
          original.forEach((t, i) => originalIndex.set(t.id, i))

          const updated = original
            .slice()
            .sort((a, b) => {
              const ia = subsetIdToOrder.has(a.id)
                ? (subsetIdToOrder.get(a.id) as number)
                : Number.POSITIVE_INFINITY
              const ib = subsetIdToOrder.has(b.id)
                ? (subsetIdToOrder.get(b.id) as number)
                : Number.POSITIVE_INFINITY
              if (ia !== ib) return ia - ib
              // 保持未变更部分原有相对顺序
              return (originalIndex.get(a.id) as number) - (originalIndex.get(b.id) as number)
            })
            .map((t) => ({ ...t, updatedAt: new Date() }))

          data.tasks = updated
          await storage.write(data)

          set((draft) => {
            draft.tasks = updated
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '重排序任务失败'
          })
          throw error
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
        return get().tasks.find((task) => task.id === id)
      },

      getTasksByCategory: (category: string) => {
        return get().tasks.filter((task) => task.category === category)
      },

      getActiveTask: () => {
        return get().tasks.find((task) => !task.isCompleted && task.completedPomodoros > 0)
      },

      // 批量操作
      deleteCompletedTasks: async () => {
        try {
          const data = await storage.read()
          data.tasks = data.tasks.filter((task) => !task.isCompleted)
          await storage.write(data)

          set((draft) => {
            draft.tasks = draft.tasks.filter((task) => !task.isCompleted)
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '删除已完成任务失败'
          })
          throw error
        }
      },

      markAllAsCompleted: async () => {
        try {
          const data = await storage.read()
          const now = new Date()

          const updatedTasks = data.tasks.map((task) =>
            task.isCompleted
              ? task
              : {
                  ...task,
                  isCompleted: true,
                  completedAt: now,
                  updatedAt: now
                }
          )

          data.tasks = updatedTasks
          await storage.write(data)

          set((draft) => {
            draft.tasks = updatedTasks
          })
        } catch (error) {
          set((draft) => {
            draft.error = error instanceof Error ? error.message : '标记所有任务为已完成失败'
          })
          throw error
        }
      },

      // 初始化
      initialize: async () => {
        // 避免重复初始化
        if (window.isTaskStoreInitialized) return
        window.isTaskStoreInitialized = true

        await get().loadTasks()
      }
    }))
  )
)

// 优化的选择器 - 使用useMemo缓存结果
export const useFilteredTasks = (): Task[] => {
  const tasks = useTaskStore((state) => state.tasks)
  const filter = useTaskStore((state) => state.filter)
  const sortBy = useTaskStore((state) => state.sortBy)
  const sortOrder = useTaskStore((state) => state.sortOrder)

  return useMemo(() => {
    let filteredTasks = [...tasks]

    // 应用过滤器
    if (filter !== 'all') {
      filteredTasks = filteredTasks.filter((task) => {
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

// 任务统计选择器
export const useTaskStats = () => {
  const tasks = useTaskStore((state) => state.tasks)

  return useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.isCompleted).length,
      inProgress: tasks.filter((task) => !task.isCompleted && task.completedPomodoros > 0).length,
      pending: tasks.filter((task) => !task.isCompleted && task.completedPomodoros === 0).length,
      totalPomodoros: tasks.reduce((sum, task) => sum + task.completedPomodoros, 0)
    }
  }, [tasks])
}
